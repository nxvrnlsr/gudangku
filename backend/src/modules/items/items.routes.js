const express = require('express');
const router = express.Router();
const { getAll, getById, getByBarcode, getBySku, create, update, deleteItem, getCategories, getUnits } = require('./items.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

router.get('/categories', getCategories);           // GET /api/items/categories
router.get('/units', getUnits);                     // GET /api/items/units
router.get('/barcode/:barcode', getByBarcode);      // GET /api/items/barcode/:barcode [H-04]
router.get('/sku/:sku', getBySku);                  // GET /api/items/sku/:sku         [H-04]
router.get('/', getAll);                            // GET /api/items
router.get('/:id', getById);                        // GET /api/items/:id
router.post('/', create);                           // POST /api/items
router.put('/:id', update);                         // PUT /api/items/:id
router.delete('/:id', deleteItem);                  // DELETE /api/items/:id

module.exports = router;
