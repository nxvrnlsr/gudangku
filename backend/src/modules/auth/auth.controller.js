const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../../config/database');

/** POST /api/auth/login */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: req.t('auth.emailPasswordRequired') });
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: req.t('auth.invalidCredentials') });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ status: 'error', message: req.t('auth.accountInactive') });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ status: 'error', message: req.t('auth.invalidCredentials') });
    }

    const rolesResult = await db.query(
      `SELECT r.name, r.permissions, ur.warehouse_id, ur.region_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // [H-01] Embed roles in JWT so middleware doesn't need a DB query per request
    const roles = rolesResult.rows;
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, roles },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // [C-04] Issue refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 hari

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, refreshHash, expiresAt]
    );

    return res.status(200).json({
      status: 'success',
      message: req.t('auth.loginSuccess'),
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900, // 15 menit dalam detik
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles,
          isAdmin: roles.some(r => r.name === 'admin'),
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ status: 'error', message: req.t('serverError') });
  }
};

/** GET /api/auth/me */
const getMe = async (req, res) => {
  return res.status(200).json({ status: 'success', data: { user: req.user } });
};

/** POST /api/auth/change-password */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ status: 'error', message: req.t('auth.passwordRequired') });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ status: 'error', message: req.t('auth.passwordMinLength') });
    }

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ status: 'error', message: req.t('auth.currentPasswordWrong') });
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    return res.status(200).json({ status: 'success', message: req.t('auth.passwordChanged') });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ status: 'error', message: req.t('serverError') });
  }
};

/**
 * POST /api/auth/refresh — [C-04] Silent token refresh
 * Body: { refresh_token: "..." }
 */
const refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ status: 'error', message: 'Refresh token diperlukan.' });
    }

    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');

    const tokenResult = await db.query(
      `SELECT rt.*, u.id AS user_id, u.name, u.email, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Refresh token tidak valid atau sudah kedaluwarsa. Silakan login ulang.' });
    }

    const tokenRow = tokenResult.rows[0];
    if (!tokenRow.is_active) {
      return res.status(401).json({ status: 'error', message: req.t('auth.accountInactive') });
    }

    // Ambil roles terbaru
    const rolesResult = await db.query(
      `SELECT r.name, r.permissions, ur.warehouse_id, ur.region_id
       FROM user_roles ur JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1`, [tokenRow.user_id]
    );
    const roles = rolesResult.rows;

    // Issue access token baru
    const newAccessToken = jwt.sign(
      { userId: tokenRow.user_id, email: tokenRow.email, roles },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    return res.json({
      status: 'success',
      data: {
        access_token: newAccessToken,
        expires_in: 900,
      },
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(500).json({ status: 'error', message: req.t('serverError') });
  }
};

/**
 * POST /api/auth/logout — [C-04] Revoke refresh token
 * Body: { refresh_token: "..." }
 */
const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) {
      const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      await db.query(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
        [tokenHash]
      );
    }
    return res.json({ status: 'success', message: 'Logout berhasil.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: req.t('serverError') });
  }
};

module.exports = { login, getMe, changePassword, refresh, logout };
