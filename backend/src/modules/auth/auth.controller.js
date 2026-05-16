const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');

/**
 * POST /api/auth/login
 * Login dengan email & password, mendapatkan JWT token
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email dan password wajib diisi.' });
    }

    // Cari user berdasarkan email
    const result = await db.query(
      'SELECT id, name, email, password_hash, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Email atau password salah.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ status: 'error', message: 'Akun Anda tidak aktif. Hubungi administrator.' });
    }

    // Verifikasi password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ status: 'error', message: 'Email atau password salah.' });
    }

    // Ambil roles user
    const rolesResult = await db.query(
      `SELECT r.name, r.permissions, ur.warehouse_id, ur.region_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    // Update last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Login berhasil.',
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
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/auth/me
 * Ambil data user yang sedang login (butuh token)
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: { user: req.user },
  });
};

/**
 * POST /api/auth/change-password
 * Ganti password user yang sedang login
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ status: 'error', message: 'Password lama dan baru wajib diisi.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Password baru minimal 8 karakter.' });
    }

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);

    if (!isValid) {
      return res.status(401).json({ status: 'error', message: 'Password lama salah.' });
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    return res.status(200).json({ status: 'success', message: 'Password berhasil diubah.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { login, getMe, changePassword };
