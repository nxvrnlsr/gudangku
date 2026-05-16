/**
 * Script untuk menjalankan SQL migration ke database
 * Jalankan: node database/migrate.js
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
    console.log('🔄 Menjalankan migration...\n');

    const migrationDir = path.join(__dirname, 'database', 'migrations');
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`  ▶ Menjalankan: ${file}`);
      const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
      await client.query(sql);
      console.log(`  ✅ Selesai: ${file}\n`);
    }

    // Hitung tabel yang berhasil dibuat
    const result = await client.query(`
      SELECT COUNT(*) as total 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log('='.repeat(45));
    console.log('✅ Migration selesai!');
    console.log(`   Total tabel di database: ${result.rows[0].total}`);
    console.log('='.repeat(45));

  } catch (err) {
    console.error('\n❌ Migration gagal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
