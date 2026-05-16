const express = require('express');
const router = express.Router();
const { stockPosition, expiryReport, stockCard, dashboard } = require('./reports.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);
router.get('/dashboard',       dashboard);       // GET /api/reports/dashboard
router.get('/stock-position',  stockPosition);   // GET /api/reports/stock-position?export=excel
router.get('/expiry',          expiryReport);    // GET /api/reports/expiry?days=30&export=excel
router.get('/stock-card',      stockCard);       // GET /api/reports/stock-card?item_id=&warehouse_id=
module.exports = router;
