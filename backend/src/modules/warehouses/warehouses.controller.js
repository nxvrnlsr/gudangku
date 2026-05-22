const db = require('../../config/database');

// ── Guard: hanya admin ────────────────────────────────────────
const requireAdmin = (req, res) => {
  if (!req.user.isAdmin) {
    res.status(403).json({ status: 'error', message: 'Akses ditolak. Hanya admin.' });
    return false;
  }
  return true;
};

// ── Helper: generate slug-friendly code ──────────────────────
const slugCode = (str, prefix = '') => {
  const base = str
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9\-]/g, '')
    .substring(0, 10);
  return prefix ? `${prefix}-${base}` : base;
};

// ============================================================
// REGIONS
// ============================================================

/** GET /api/warehouses/regions — Semua region & kota */
const getRegions = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.id, r.name, r.code,
             COALESCE(json_agg(
               json_build_object('id', c.id, 'name', c.name, 'code', c.code)
               ORDER BY c.name
             ) FILTER (WHERE c.id IS NOT NULL), '[]') AS cities
      FROM regions r
      LEFT JOIN cities c ON c.region_id = r.id
      GROUP BY r.id ORDER BY r.name
    `);
    return res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** POST /api/warehouses/regions — Buat region baru (admin only) */
const createRegion = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { name, code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Nama provinsi wajib diisi.' });
    }
    const finalCode = (code || slugCode(name)).toUpperCase().trim();
    const result = await db.query(
      `INSERT INTO regions (name, code) VALUES ($1, $2) RETURNING *`,
      [name.trim(), finalCode]
    );
    return res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'Kode provinsi sudah digunakan.' });
    }
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** PUT /api/warehouses/regions/:id — Update region (admin only) */
const updateRegion = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Nama provinsi wajib diisi.' });
    }
    const result = await db.query(
      `UPDATE regions SET name = $1, code = $2 WHERE id = $3 RETURNING *`,
      [name.trim(), (code || slugCode(name)).toUpperCase().trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Provinsi tidak ditemukan.' });
    }
    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'Kode provinsi sudah digunakan.' });
    }
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** DELETE /api/warehouses/regions/:id — Hapus region (admin only) */
const deleteRegion = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const check = await db.query('SELECT COUNT(*) FROM cities WHERE region_id = $1', [id]);
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(409).json({ status: 'error', message: 'Tidak bisa dihapus, masih ada kota di provinsi ini.' });
    }
    const result = await db.query('DELETE FROM regions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Provinsi tidak ditemukan.' });
    }
    return res.status(200).json({ status: 'success', message: 'Provinsi berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

// ============================================================
// CITIES
// ============================================================

/** GET /api/warehouses/cities — Semua kota (dengan filter region) */
const getCities = async (req, res) => {
  try {
    const { region_id } = req.query;
    const params = [];
    let where = '';
    if (region_id) { params.push(region_id); where = 'WHERE c.region_id = $1'; }
    const result = await db.query(`
      SELECT c.id, c.name, c.code, c.region_id,
             r.name AS region_name, r.code AS region_code
      FROM cities c
      JOIN regions r ON r.id = c.region_id
      ${where}
      ORDER BY r.name, c.name
    `, params);
    return res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** POST /api/warehouses/cities — Buat kota baru (admin only) */
const createCity = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { region_id, name, code } = req.body;
    if (!region_id || !name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Region dan nama kota wajib diisi.' });
    }
    const finalCode = (code || slugCode(name)).toUpperCase().trim();
    const result = await db.query(
      `INSERT INTO cities (region_id, name, code) VALUES ($1, $2, $3) RETURNING *`,
      [region_id, name.trim(), finalCode]
    );
    return res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'Kode kota sudah digunakan.' });
    }
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** PUT /api/warehouses/cities/:id — Update kota (admin only) */
const updateCity = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { region_id, name, code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Nama kota wajib diisi.' });
    }
    const result = await db.query(
      `UPDATE cities SET region_id = COALESCE($1, region_id), name = $2, code = $3
       WHERE id = $4 RETURNING *`,
      [region_id || null, name.trim(), (code || slugCode(name)).toUpperCase().trim(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Kota tidak ditemukan.' });
    }
    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'Kode kota sudah digunakan.' });
    }
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** DELETE /api/warehouses/cities/:id — Hapus kota (admin only) */
const deleteCity = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const check = await db.query('SELECT COUNT(*) FROM warehouses WHERE city_id = $1', [id]);
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(409).json({ status: 'error', message: 'Tidak bisa dihapus, masih ada gudang di kota ini.' });
    }
    const result = await db.query('DELETE FROM cities WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Kota tidak ditemukan.' });
    }
    return res.status(200).json({ status: 'success', message: 'Kota berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

// ============================================================
// WAREHOUSES
// ============================================================

/** GET /api/warehouses — Semua gudang */
const getAll = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT w.*, c.name AS city_name, c.code AS city_code,
             r.name AS region_name, r.code AS region_code
      FROM warehouses w
      JOIN cities c ON c.id = w.city_id
      JOIN regions r ON r.id = c.region_id
      ORDER BY r.name, c.name, w.name
    `);
    return res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: req.t('warehouses.serverError') });
  }
};

/** GET /api/warehouses/:id — Detail gudang + lokasi rak */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const [whResult, locResult] = await Promise.all([
      db.query(`
        SELECT w.*, c.name AS city_name, r.name AS region_name
        FROM warehouses w JOIN cities c ON c.id = w.city_id JOIN regions r ON r.id = c.region_id
        WHERE w.id = $1
      `, [id]),
      db.query(`SELECT * FROM warehouse_locations WHERE warehouse_id = $1 ORDER BY zone, rack, bin`, [id]),
    ]);
    if (whResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: req.t('warehouses.notFound') });
    }
    return res.status(200).json({
      status: 'success',
      data: { ...whResult.rows[0], locations: locResult.rows },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** POST /api/warehouses — Buat gudang baru (admin only) */
const createWarehouse = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { city_id, name, code, address, pic_name, pic_phone } = req.body;
    if (!city_id || !name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Kota dan nama gudang wajib diisi.' });
    }
    const finalCode = (code || `GDG-${slugCode(name)}`).toUpperCase().trim();
    const result = await db.query(
      `INSERT INTO warehouses (city_id, name, code, address, pic_name, pic_phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [city_id, name.trim(), finalCode, address || null, pic_name || null, pic_phone || null]
    );
    return res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'Kode gudang sudah digunakan.' });
    }
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** PUT /api/warehouses/:id — Update gudang (admin only) */
const updateWarehouse = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { city_id, name, code, address, pic_name, pic_phone, is_active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Nama gudang wajib diisi.' });
    }
    const result = await db.query(`
      UPDATE warehouses SET
        city_id   = COALESCE($1, city_id),
        name      = $2,
        code      = COALESCE($3, code),
        address   = $4,
        pic_name  = $5,
        pic_phone = $6,
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
      WHERE id = $8 RETURNING *
    `, [city_id || null, name.trim(), code ? code.toUpperCase().trim() : null,
        address || null, pic_name || null, pic_phone || null,
        is_active !== undefined ? is_active : null, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Gudang tidak ditemukan.' });
    }
    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'Kode gudang sudah digunakan.' });
    }
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** DELETE /api/warehouses/:id — Hapus gudang (admin only) */
const deleteWarehouse = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    // Cek apakah ada stok/transaksi
    const checks = await Promise.all([
      db.query('SELECT COUNT(*) FROM stock_balances WHERE warehouse_id = $1 AND qty_on_hand > 0', [id]),
      db.query('SELECT COUNT(*) FROM stock_receipts WHERE warehouse_id = $1', [id]),
    ]);
    if (parseInt(checks[0].rows[0].count) > 0) {
      return res.status(409).json({ status: 'error', message: 'Tidak bisa dihapus, gudang masih memiliki stok.' });
    }
    if (parseInt(checks[1].rows[0].count) > 0) {
      return res.status(409).json({ status: 'error', message: 'Tidak bisa dihapus, gudang memiliki riwayat transaksi.' });
    }
    const result = await db.query('DELETE FROM warehouses WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Gudang tidak ditemukan.' });
    }
    return res.status(200).json({ status: 'success', message: 'Gudang berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** GET /api/warehouses/:id/stock — Saldo stok di gudang ini */
const getStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { search } = req.query;
    const params = [id];
    let searchClause = '';
    if (search) { params.push(`%${search}%`); searchClause = `AND (i.name ILIKE $2 OR i.sku ILIKE $2)`; }

    const result = await db.query(`
      SELECT sb.qty_on_hand, sb.qty_reserved, sb.qty_available, sb.avg_cost_price,
             sb.qty_on_hand * sb.avg_cost_price AS stock_value,
             i.id AS item_id, i.name AS item_name, i.sku, i.min_stock_qty,
             u.symbol AS unit_symbol,
             CASE
               WHEN sb.qty_available <= 0 THEN 'stockout'
               WHEN sb.qty_available <= i.min_stock_qty THEN 'minimum'
               WHEN i.max_stock_qty IS NOT NULL AND sb.qty_on_hand > i.max_stock_qty THEN 'overstock'
               ELSE 'normal'
             END AS stock_status
      FROM stock_balances sb
      JOIN items i ON i.id = sb.item_id
      JOIN units u ON u.id = i.base_unit_id
      WHERE sb.warehouse_id = $1 ${searchClause}
      ORDER BY i.name
    `, params);

    return res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

module.exports = {
  // Regions
  getRegions, createRegion, updateRegion, deleteRegion,
  // Cities
  getCities, createCity, updateCity, deleteCity,
  // Warehouses
  getAll, getById, createWarehouse, updateWarehouse, deleteWarehouse,
  // Stock
  getStock,
};
