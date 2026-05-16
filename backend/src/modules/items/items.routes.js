const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, getCategories, getUnits } = require('./items.controller');
const { authenticate } = require('../../middleware/auth');

// Semua route items butuh login
router.use(authenticate);

router.get('/categories', getCategories);  // GET /api/items/categories
router.get('/units', getUnits);            // GET /api/items/units
router.get('/', getAll);                   // GET /api/items
router.get('/:id', getById);              // GET /api/items/:id
router.post('/', create);                  // POST /api/items
router.put('/:id', update);              // PUT /api/items/:id

module.exports = router;
