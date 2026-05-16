const express = require('express');
const router = express.Router();
const { getAll, getSummary, updateStatus } = require('./batches.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);
router.get('/summary', getSummary);        // GET /api/batches/summary
router.get('/', getAll);                    // GET /api/batches
router.put('/:id/status', updateStatus);  // PUT /api/batches/:id/status
module.exports = router;
