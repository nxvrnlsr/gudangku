const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Middleware: Verifikasi JWT token dari header Authorization
 * Setiap request ke route yang dilindungi harus melewati middleware ini
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Akses ditolak. Token tidak ditemukan.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ambil data user terkini dari database
    const result = await db.query(
      'SELECT id, name, email, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        status: 'error',
        message: 'Token tidak valid atau user tidak aktif.',
      });
    }

    // Ambil semua roles user
    const rolesResult = await db.query(
      `SELECT r.name, ur.warehouse_id, ur.region_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [decoded.userId]
    );

    req.user = {
      ...result.rows[0],
      roles: rolesResult.rows,
      isAdmin: rolesResult.rows.some(r => r.name === 'admin'),
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token sudah kadaluarsa. Silakan login ulang.' });
    }
    return res.status(401).json({ status: 'error', message: 'Token tidak valid.' });
  }
};

module.exports = { authenticate };
