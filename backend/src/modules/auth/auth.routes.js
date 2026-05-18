const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, getMe, changePassword, refresh, logout } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

// [C-03] Rate limit: maks 10 percobaan login per 15 menit per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
});

router.post('/login', loginLimiter, login);                    // public
router.post('/refresh', refresh);                              // [C-04] public
router.post('/logout', authenticate, logout);                  // [C-04] butuh token
router.get('/me', authenticate, getMe);                        // butuh token
router.post('/change-password', authenticate, changePassword); // butuh token

module.exports = router;
