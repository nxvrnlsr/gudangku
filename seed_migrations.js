require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query(`
  INSERT INTO schema_migrations (filename) VALUES 
  ('001_create_all_tables.sql'),
  ('002_enable_rls.sql')
  ON CONFLICT DO NOTHING
`).then(() => {
  console.log('✅ Riwayat migration lama berhasil diisi');
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
