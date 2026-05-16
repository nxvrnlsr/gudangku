const express = require('express');
const router = express.Router();
const { getAll, getById, create, confirm, cancel } = require('./issues.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.post('/:id/confirm', confirm);
router.put('/:id/cancel', cancel);
module.exports = router;
