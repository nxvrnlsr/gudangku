const express = require('express');
const router = express.Router();
const {
  getRegions, createRegion, updateRegion, deleteRegion,
  getCities,  createCity,   updateCity,   deleteCity,
  getAll, getById, createWarehouse, updateWarehouse, deleteWarehouse,
  getStock,
} = require('./warehouses.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

// ── Regions ──────────────────────────────────────────────────
router.get('/regions',           getRegions);          // GET  /api/warehouses/regions
router.post('/regions',          createRegion);        // POST /api/warehouses/regions
router.put('/regions/:id',       updateRegion);        // PUT  /api/warehouses/regions/:id
router.delete('/regions/:id',    deleteRegion);        // DEL  /api/warehouses/regions/:id

// ── Cities ───────────────────────────────────────────────────
router.get('/cities',            getCities);           // GET  /api/warehouses/cities
router.post('/cities',           createCity);          // POST /api/warehouses/cities
router.put('/cities/:id',        updateCity);          // PUT  /api/warehouses/cities/:id
router.delete('/cities/:id',     deleteCity);          // DEL  /api/warehouses/cities/:id

// ── Warehouses ───────────────────────────────────────────────
router.get('/',                  getAll);              // GET  /api/warehouses
router.post('/',                 createWarehouse);     // POST /api/warehouses
router.get('/:id/stock',         getStock);            // GET  /api/warehouses/:id/stock
router.get('/:id',               getById);             // GET  /api/warehouses/:id
router.put('/:id',               updateWarehouse);     // PUT  /api/warehouses/:id
router.delete('/:id',            deleteWarehouse);     // DEL  /api/warehouses/:id

module.exports = router;
