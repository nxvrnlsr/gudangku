const express = require('express');
const router = express.Router();
const { login, getMe, changePassword } = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

// POST /api/auth/login — public
router.post('/login', login);

// GET /api/auth/me — butuh token
router.get('/me', authenticate, getMe);

// POST /api/auth/change-password — butuh token
router.post('/change-password', authenticate, changePassword);

module.exports = router;
