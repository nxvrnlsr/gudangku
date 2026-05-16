const express = require('express');
const router = express.Router();
const { getUsers, getRoles, createUser, updateUser, resetPassword } = require('./users.controller');
const { authenticate } = require('../../middleware/auth');

// Semua route butuh autentikasi
router.use(authenticate);

router.get('/',              getUsers);       // GET  /api/users
router.get('/roles',         getRoles);       // GET  /api/users/roles
router.post('/',             createUser);     // POST /api/users
router.put('/:id',           updateUser);     // PUT  /api/users/:id
router.put('/:id/reset-password', resetPassword); // PUT /api/users/:id/reset-password

module.exports = router;
