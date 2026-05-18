const router = require('express').Router();

/**
 * API v1 Router — [H-02] Versioned routes for mobile app compatibility
 *
 * Desktop (Electron) tetap pakai /api/* untuk backward compatibility.
 * Mobile app dan integrasi baru wajib pakai /api/v1/*.
 * Kalau ada breaking changes di masa depan, buat /api/v2/* tanpa merusak v1.
 */

router.use('/auth',       require('../modules/auth/auth.routes'));
router.use('/items',      require('../modules/items/items.routes'));
router.use('/warehouses', require('../modules/warehouses/warehouses.routes'));
router.use('/batches',    require('../modules/batches/batches.routes'));
router.use('/receipts',   require('../modules/receipts/receipts.routes'));
router.use('/issues',     require('../modules/issues/issues.routes'));
router.use('/transfers',  require('../modules/transfers/transfers.routes'));
router.use('/reports',    require('../modules/reports/reports.routes'));
router.use('/users',      require('../modules/users/users.routes'));

module.exports = router;
