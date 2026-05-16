/**
 * Script untuk menjalankan SQL migration ke database
 * Hanya migration BARU yang belum pernah dijalankan yang akan dieksekusi.
 * Jalankan: node migrate.js
 */
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  const client = await pool.connect();
  try {
    // Buat tabel tracking migration jika belum ada
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    console.log('🔄 Mengecek migration...\n');

    const migrationDir = path.join(__dirname, 'database', 'migrations');
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Ambil daftar migration yang sudah pernah dijalankan
    const applied = await client.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.rows.map(r => r.filename));

    let newCount = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ⏭  Dilewati (sudah ada): ${file}`);
        continue;
      }
      console.log(`  ▶ Menjalankan: ${file}`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✅ Selesai: ${file}`);
      newCount++;
    }

    const result = await client.query(
      `SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    console.log('\n' + '='.repeat(45));
    if (newCount > 0) {
      console.log(`✅ ${newCount} migration baru berhasil dijalankan!`);
    } else {
      console.log('✅ Semua migration sudah up-to-date!');
    }
    console.log(`   Total tabel di database: ${result.rows[0].total}`);
    console.log('='.repeat(45));

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Migration gagal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
