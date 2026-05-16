const db = require('../../config/database');

/** GET /api/batches — Monitor semua batch & expiry dengan filter */
const getAll = async (req, res) => {
  try {
    const { warehouse_id, status, expiry_filter, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['b.remaining_qty > 0'];

    if (warehouse_id) { params.push(warehouse_id); conditions.push(`b.warehouse_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`b.status = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(i.name ILIKE $${params.length} OR b.batch_number ILIKE $${params.length})`); }

    // Filter berdasarkan rentang waktu expiry
    if (expiry_filter === 'expired')  conditions.push(`b.expiry_date < CURRENT_DATE`);
    if (expiry_filter === 'critical') conditions.push(`b.expiry_date >= CURRENT_DATE AND b.expiry_date <= CURRENT_DATE + 7`);
    if (expiry_filter === 'warning')  conditions.push(`b.expiry_date > CURRENT_DATE + 7 AND b.expiry_date <= CURRENT_DATE + 30`);
    if (expiry_filter === 'safe')     conditions.push(`(b.expiry_date > CURRENT_DATE + 30 OR b.expiry_date IS NULL)`);

    const where = 'WHERE ' + conditions.join(' AND ');

    const [rows, count] = await Promise.all([
      db.query(`
        SELECT
          b.id, b.batch_number, b.manufacture_date, b.expiry_date,
          b.initial_qty, b.remaining_qty, b.cost_price, b.status,
          b.created_at AS receipt_date,
          i.name AS item_name, i.sku,
          u.symbol AS unit_symbol,
          w.name AS warehouse_name, w.code AS warehouse_code,
          c.name AS category_name,
          (b.expiry_date - CURRENT_DATE) AS days_until_expiry,
          CASE
            WHEN b.expiry_date IS NULL THEN 'no_expiry'
            WHEN b.expiry_date < CURRENT_DATE THEN 'expired'
            WHEN b.expiry_date <= CURRENT_DATE + 7 THEN 'critical'
            WHEN b.expiry_date <= CURRENT_DATE + 30 THEN 'warning'
            ELSE 'safe'
          END AS expiry_status
        FROM batches b
        JOIN items i ON i.id = b.item_id
        JOIN units u ON u.id = i.base_unit_id
        JOIN warehouses w ON w.id = b.warehouse_id
        LEFT JOIN item_categories c ON c.id = i.category_id
        ${where}
        ORDER BY b.expiry_date ASC NULLS LAST, i.name ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) FROM batches b JOIN items i ON i.id = b.item_id ${where}`, params),
    ]);

    return res.status(200).json({
      status: 'success',
      data: rows.rows,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: parseInt(count.rows[0].count),
      },
    });
  } catch (err) {
    console.error('Batches getAll error:', err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** GET /api/batches/summary — Ringkasan status batch (untuk dashboard) */
const getSummary = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const params = [];
    const warehouseFilter = warehouse_id
      ? (params.push(warehouse_id), `AND b.warehouse_id = $1`)
      : '';

    const result = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE b.expiry_date < CURRENT_DATE) AS expired,
        COUNT(*) FILTER (WHERE b.expiry_date >= CURRENT_DATE AND b.expiry_date <= CURRENT_DATE + 7) AS critical,
        COUNT(*) FILTER (WHERE b.expiry_date > CURRENT_DATE + 7 AND b.expiry_date <= CURRENT_DATE + 30) AS warning,
        COUNT(*) FILTER (WHERE b.expiry_date > CURRENT_DATE + 30 OR b.expiry_date IS NULL) AS safe
      FROM batches b
      WHERE b.remaining_qty > 0 AND b.status = 'active' ${warehouseFilter}
    `, params);

    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** PUT /api/batches/:id/status — Update status batch (quarantine/write_off) */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const allowed = ['quarantine', 'written_off'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ status: 'error', message: `Status harus salah satu dari: ${allowed.join(', ')}` });
    }

    const result = await db.query(
      `UPDATE batches SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Batch tidak ditemukan.' });
    }

    return res.status(200).json({ status: 'success', message: `Batch berhasil diubah ke status ${status}.`, data: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { getAll, getSummary, updateStatus };
