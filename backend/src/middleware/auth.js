const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: req.t('unauthorized') });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      'SELECT id, name, email, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ status: 'error', message: req.t('tokenInvalid') });
    }

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
      return res.status(401).json({ status: 'error', message: req.t('tokenExpired') });
    }
    return res.status(401).json({ status: 'error', message: req.t('tokenInvalid') });
  }
};

module.exports = { authenticate };
