const express = require('express');
const router = express.Router();
const { getAll, getById, getStock, getRegions } = require('./warehouses.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);
router.get('/regions', getRegions);      // GET /api/warehouses/regions
router.get('/', getAll);                  // GET /api/warehouses
router.get('/:id', getById);            // GET /api/warehouses/:id
router.get('/:id/stock', getStock);     // GET /api/warehouses/:id/stock
module.exports = router;
