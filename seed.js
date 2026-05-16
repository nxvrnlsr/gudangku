/**
 * Script untuk mengisi data awal (seed data)
 * Jalankan: node seed.js
 */
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Mengisi data awal (seed data)...\n');
    await client.query('BEGIN');

    // ── 1. ROLES ─────────────────────────────────────────
    console.log('  ▶ Membuat roles...');
    await client.query(`
      INSERT INTO roles (name, description, permissions) VALUES
      ('admin',            'Administrator sistem, akses penuh',
       '{"all": true}'),
      ('kepala_gudang',    'Kepala Gudang, akses penuh ke operasional gudang',
       '{"receipts":{"create":true,"approve":true},"issues":{"create":true,"approve":true},"transfers":{"create":true,"approve":true},"opname":{"create":true,"approve":true},"reports":{"view":true,"export":true}}'),
      ('staff_gudang',     'Staff Gudang, buat transaksi tapi tidak bisa approve',
       '{"receipts":{"create":true,"approve":false},"issues":{"create":true,"approve":false},"transfers":{"create":true,"approve":false}}'),
      ('regional_manager', 'Manajer Regional, lihat laporan semua gudang di region',
       '{"reports":{"view":true,"export":true}}'),
      ('viewer',           'Hanya bisa melihat laporan dan dashboard',
       '{"reports":{"view":true,"export":false}}')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('  ✅ Roles dibuat\n');

    // ── 2. ADMIN USER ────────────────────────────────────
    console.log('  ▶ Membuat user admin...');
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    const userResult = await client.query(`
      INSERT INTO users (name, email, password_hash, phone)
      VALUES ('System Administrator', 'admin@gudangku.com', $1, '08100000000')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [passwordHash]);
    const adminId = userResult.rows[0].id;
    console.log('  ✅ Admin user dibuat (email: admin@gudangku.com, password: Admin@123)\n');

    // ── 3. REGIONS ───────────────────────────────────────
    console.log('  ▶ Membuat regions...');
    await client.query(`
      INSERT INTO regions (name, code) VALUES
      ('Jawa',       'JW'),
      ('Sumatera',   'SM'),
      ('Kalimantan', 'KL'),
      ('Sulawesi',   'SL'),
      ('Bali & Nusa Tenggara', 'BN'),
      ('Maluku & Papua',       'MP')
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✅ 6 Regions dibuat\n');

    // ── 4. CITIES ────────────────────────────────────────
    console.log('  ▶ Membuat kota-kota utama...');
    await client.query(`
      INSERT INTO cities (region_id, name, code)
      SELECT r.id, c.name, c.code FROM (VALUES
        ('JW', 'Jakarta',   'JKT'),
        ('JW', 'Surabaya',  'SBY'),
        ('JW', 'Bandung',   'BDG'),
        ('JW', 'Semarang',  'SMG'),
        ('JW', 'Yogyakarta','YGY'),
        ('SM', 'Medan',     'MDN'),
        ('SM', 'Palembang', 'PLB'),
        ('SM', 'Pekanbaru', 'PKU'),
        ('KL', 'Balikpapan','BPN'),
        ('KL', 'Banjarmasin','BJM'),
        ('SL', 'Makassar',  'MKS'),
        ('BN', 'Denpasar',  'DPS')
      ) AS c(region_code, name, code)
      JOIN regions r ON r.code = c.region_code
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✅ 12 Kota dibuat\n');

    // ── 5. GUDANG PILOT (Jakarta) ────────────────────────
    console.log('  ▶ Membuat gudang pilot Jakarta...');
    await client.query(`
      INSERT INTO warehouses (city_id, name, code, address, pic_name, pic_phone)
      SELECT c.id, 'Gudang Jakarta Pusat', 'GDG-JKT-001',
             'Jl. Raya Gudang No. 1, Jakarta Pusat, DKI Jakarta 10000',
             'Budi Santoso', '08211234567'
      FROM cities c WHERE c.code = 'JKT'
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✅ Gudang pilot Jakarta dibuat\n');

    // ── 6. UNITS (Satuan) ────────────────────────────────
    console.log('  ▶ Membuat satuan barang...');
    await client.query(`
      INSERT INTO units (name, symbol) VALUES
      ('Kilogram',   'Kg'),
      ('Gram',       'gr'),
      ('Liter',      'Ltr'),
      ('Mililiter',  'mL'),
      ('Pcs',        'Pcs'),
      ('Karton',     'Ktn'),
      ('Sak',        'Sak'),
      ('Dus',        'Dus'),
      ('Lusin',      'Lsn'),
      ('Botol',      'Btl'),
      ('Kaleng',     'Klg'),
      ('Bungkus',    'Bks')
      ON CONFLICT (symbol) DO NOTHING;
    `);
    console.log('  ✅ 12 Satuan dibuat\n');

    // ── 7. ITEM CATEGORIES ───────────────────────────────
    console.log('  ▶ Membuat kategori barang...');
    await client.query(`
      INSERT INTO item_categories (name, code) VALUES
      ('Beras & Serealia',    'BERAS'),
      ('Minyak & Lemak',      'MINYAK'),
      ('Gula & Pemanis',      'GULA'),
      ('Makanan Kaleng',      'KALENG'),
      ('Minuman',             'MINUM'),
      ('Bumbu & Rempah',      'BUMBU'),
      ('Tepung & Olahan',     'TEPUNG'),
      ('Susu & Produk Dairy', 'SUSU'),
      ('Mi & Pasta',          'MI'),
      ('Lain-lain',           'LAIN')
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✅ 10 Kategori barang dibuat\n');

    // ── 8. CONTOH BARANG SEMBAKO ─────────────────────────
    console.log('  ▶ Membuat contoh master barang sembako...');
    await client.query(`
      INSERT INTO items (category_id, base_unit_id, name, sku, barcode, shelf_life_days, min_stock_qty, max_stock_qty, cost_price)
      SELECT cat.id, unit.id, i.name, i.sku, i.barcode, i.shelf_life, i.min_qty, i.max_qty, i.cost
      FROM (VALUES
        ('BERAS',  'Sak',  'Beras Rojo Lele 50kg',       'BRS-ROJO-50KG',  '8991100001111', 365, 20,  200, 550000),
        ('BERAS',  'Kg',   'Beras Pandan Wangi 5kg',     'BRS-PNDW-5KG',   '8991100002222', 365, 50,  500,  65000),
        ('MINYAK', 'Ktn',  'Minyak Goreng Sania 2L',     'MYK-SNIA-2LKT',  '8991200001111', 365, 30,  300, 145000),
        ('MINYAK', 'Btl',  'Minyak Goreng Tropical 1L',  'MYK-TRPC-1LBT',  '8991200002222', 365, 50,  500,  24000),
        ('GULA',   'Sak',  'Gula Pasir Putih 50kg',      'GLA-PSTR-50KG',  '8991300001111', 730, 10,  100, 785000),
        ('KALENG', 'Dus',  'Sardines ABC 425g',           'KLG-SABC-425DZ', '8991400001111', 730, 20,  200,  87000),
        ('KALENG', 'Klg',  'Kornet Pronas 198g',          'KLG-PROS-198KL', '8991400002222', 730, 50,  500,  16500),
        ('MINUM',  'Dus',  'Aqua 600ml (24 Botol)',       'MNM-AQUA-600DZ', '8991500001111', 365, 30,  300,  48000),
        ('TEPUNG', 'Sak',  'Tepung Terigu Bogasari 25kg', 'TPG-BGSRI-25KG', '8991600001111', 180, 15,  150, 175000),
        ('MI',     'Ktn',  'Indomie Goreng (40 pcs)',     'MI-INDMG-40KT',  '8991700001111', 365, 50,  500,  98000)
      ) AS i(cat_code, unit_sym, name, sku, barcode, shelf_life, min_qty, max_qty, cost)
      JOIN item_categories cat ON cat.code = i.cat_code
      JOIN units unit ON unit.symbol = i.unit_sym
      ON CONFLICT (sku) DO NOTHING;
    `);
    console.log('  ✅ 10 Contoh barang sembako dibuat\n');

    // ── 9. CONTOH SUPPLIER ───────────────────────────────
    console.log('  ▶ Membuat contoh supplier...');
    await client.query(`
      INSERT INTO suppliers (name, code, address, phone, email) VALUES
      ('PT Beras Makmur Indonesia',  'SUP-BERAS-001', 'Jl. Raya Cikampek No. 10, Karawang', '02218123456', 'order@berasmakmur.co.id'),
      ('PT Wilmar International',    'SUP-MINYAK-001', 'Jl. Gatot Subroto No. 88, Jakarta',  '02121234567', 'sales@wilmar.co.id'),
      ('PT Rajawali Nusantara',      'SUP-GULA-001',   'Jl. Pasaraya No. 5, Surabaya',       '03187654321', 'supply@rajawali.co.id'),
      ('PT Heinz ABC Indonesia',     'SUP-KALENG-001', 'Kawasan Industri MM2100, Bekasi',     '02188112233', 'order@abc.co.id')
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✅ 4 Supplier dibuat\n');

    // ── 10. ASSIGN ADMIN ROLE ────────────────────────────
    console.log('  ▶ Assign role admin ke user admin...');
    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, r.id FROM roles r WHERE r.name = 'admin'
      ON CONFLICT DO NOTHING;
    `, [adminId]);
    console.log('  ✅ Role admin di-assign\n');

    await client.query('COMMIT');

    // Ringkasan
    const counts = await client.query(`
      SELECT 'roles' as tbl, COUNT(*) FROM roles
      UNION ALL SELECT 'users', COUNT(*) FROM users
      UNION ALL SELECT 'regions', COUNT(*) FROM regions
      UNION ALL SELECT 'cities', COUNT(*) FROM cities
      UNION ALL SELECT 'warehouses', COUNT(*) FROM warehouses
      UNION ALL SELECT 'units', COUNT(*) FROM units
      UNION ALL SELECT 'item_categories', COUNT(*) FROM item_categories
      UNION ALL SELECT 'items', COUNT(*) FROM items
      UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers;
    `);

    console.log('='.repeat(45));
    console.log('✅ Seed data selesai! Ringkasan:');
    counts.rows.forEach(r => {
      console.log(`   ${r.tbl.padEnd(20)}: ${r.count} record`);
    });
    console.log('='.repeat(45));
    console.log('\n🔑 Login credentials:');
    console.log('   Email   : admin@gudangku.com');
    console.log('   Password: Admin@123\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed gagal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
