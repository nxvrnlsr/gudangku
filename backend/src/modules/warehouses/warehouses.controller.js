const db = require('../../config/database');

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

/** GET /api/warehouses/regions — Semua region & kota */
const getRegions = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.id, r.name, r.code,
             json_agg(json_build_object('id', c.id, 'name', c.name, 'code', c.code) ORDER BY c.name) AS cities
      FROM regions r
      LEFT JOIN cities c ON c.region_id = r.id
      GROUP BY r.id ORDER BY r.name
    `);
    return res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { getAll, getById, getStock, getRegions };
