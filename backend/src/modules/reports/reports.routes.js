const express = require('express');
const router = express.Router();
const { stockPosition, expiryReport, stockCard, dashboard, getExportSettings, updateExportSettings, openExportFolder } = require('./reports.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);
router.get('/dashboard',         dashboard);             // GET  /api/reports/dashboard
router.get('/stock-position',    stockPosition);         // GET  /api/reports/stock-position?export=excel
router.get('/expiry',            expiryReport);          // GET  /api/reports/expiry?days=30&export=excel
router.get('/stock-card',        stockCard);             // GET  /api/reports/stock-card?item_id=&warehouse_id=
router.get('/export-settings',   getExportSettings);    // GET  /api/reports/export-settings
router.put('/export-settings',   updateExportSettings); // PUT  /api/reports/export-settings
router.post('/open-folder',      openExportFolder);     // POST /api/reports/open-folder
module.exports = router;
