require('dotenv').config();
const { Pool } = require('pg');

// Koneksi pool ke PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,              // Maksimum 20 koneksi bersamaan
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test koneksi saat startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Gagal koneksi ke database:', err.message);
  } else {
    console.log('✅ Database PostgreSQL terhubung!');
    release();
  }
});

// Helper untuk query
const query = (text, params) => pool.query(text, params);

// Helper untuk transaksi (beberapa query sekaligus, semua atau tidak sama sekali)
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
