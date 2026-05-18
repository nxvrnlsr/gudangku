const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      status: 'success',
      message: req.t('auth.loginSuccess'),
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: rolesResult.rows,
          isAdmin: rolesResult.rows.some(r => r.name === 'admin'),
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

module.exports = { login, getMe, changePassword };
