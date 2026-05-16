const express = require('express');
const router = express.Router();
const { getAll, getById, create, dispatch, receive } = require('./transfers.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.post('/:id/dispatch', dispatch);   // Kirim dari gudang asal
router.post('/:id/receive', receive);     // Terima di gudang tujuan
module.exports = router;
