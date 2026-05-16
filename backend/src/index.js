require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────
app.use(helmet());           // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());     // Parse JSON request body
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ──────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'GudangKu API berjalan! 🏭',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────
app.use('/api/auth',       require('./modules/auth/auth.routes'));
app.use('/api/items',      require('./modules/items/items.routes'));
app.use('/api/warehouses', require('./modules/warehouses/warehouses.routes'));
app.use('/api/batches',    require('./modules/batches/batches.routes'));
// app.use('/api/receipts',   require('./modules/receipts/receipts.routes'));   // coming soon
// app.use('/api/issues',     require('./modules/issues/issues.routes'));        // coming soon
// app.use('/api/transfers',  require('./modules/transfers/transfers.routes'));  // coming soon
// app.use('/api/opname',     require('./modules/opname/opname.routes'));        // coming soon
// app.use('/api/reports',    require('./modules/reports/reports.routes'));      // coming soon

// ─── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route tidak ditemukan' });
});

// ─── Global Error Handler ──────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
});

// ─── Start Server ──────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 GudangKu API Server berjalan di port ${PORT}`);
  console.log(`   ➜ Local:   http://localhost:${PORT}`);
  console.log(`   ➜ Mode:    ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
