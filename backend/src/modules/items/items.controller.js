const db = require('../../config/database');

/**
 * GET /api/items — Daftar semua barang (dengan filter & pagination)
 */
const getAll = async (req, res) => {
  try {
    const { search, category_id, is_active = 'true', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (is_active !== 'all') {
      params.push(is_active === 'true');
      conditions.push(`i.is_active = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(i.name ILIKE $${params.length} OR i.sku ILIKE $${params.length} OR i.barcode ILIKE $${params.length})`);
    }
    if (category_id) {
      params.push(category_id);
      conditions.push(`i.category_id = $${params.length}`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [itemsResult, countResult] = await Promise.all([
      db.query(`
        SELECT
          i.id, i.name, i.sku, i.barcode, i.shelf_life_days,
          i.min_stock_qty, i.max_stock_qty, i.cost_price, i.is_active,
          i.base_unit_id,
          c.name AS category_name, c.code AS category_code,
          u.name AS unit_name, u.symbol AS unit_symbol
        FROM items i
        LEFT JOIN item_categories c ON c.id = i.category_id
        LEFT JOIN units u ON u.id = i.base_unit_id
        ${where}
        ORDER BY i.name ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), offset]),
      db.query(`
        SELECT COUNT(*) FROM items i ${where}
      `, params),
    ]);

    return res.status(200).json({
      status: 'success',
      data: itemsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        total_pages: Math.ceil(countResult.rows[0].count / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Items getAll error:', err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/items/:id — Detail satu barang beserta saldo stok per gudang
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [itemResult, stockResult, batchResult] = await Promise.all([
      db.query(`
        SELECT i.*, c.name AS category_name, u.name AS unit_name, u.symbol AS unit_symbol
        FROM items i
        LEFT JOIN item_categories c ON c.id = i.category_id
        LEFT JOIN units u ON u.id = i.base_unit_id
        WHERE i.id = $1
      `, [id]),
      db.query(`
        SELECT sb.qty_on_hand, sb.qty_reserved, sb.qty_available, sb.avg_cost_price,
               w.name AS warehouse_name, w.code AS warehouse_code
        FROM stock_balances sb
        JOIN warehouses w ON w.id = sb.warehouse_id
        WHERE sb.item_id = $1
        ORDER BY w.name
      `, [id]),
      db.query(`
        SELECT b.batch_number, b.expiry_date, b.remaining_qty, b.status,
               w.name AS warehouse_name,
               CASE
                 WHEN b.expiry_date IS NULL THEN NULL
                 WHEN b.expiry_date < CURRENT_DATE THEN 'expired'
                 WHEN b.expiry_date <= CURRENT_DATE + 7 THEN 'critical'
                 WHEN b.expiry_date <= CURRENT_DATE + 30 THEN 'warning'
                 ELSE 'safe'
               END AS expiry_status,
               (b.expiry_date - CURRENT_DATE) AS days_until_expiry
        FROM batches b
        JOIN warehouses w ON w.id = b.warehouse_id
        WHERE b.item_id = $1 AND b.status = 'active' AND b.remaining_qty > 0
        ORDER BY b.expiry_date ASC NULLS LAST
      `, [id]),
    ]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Barang tidak ditemukan.' });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        ...itemResult.rows[0],
        stock_by_warehouse: stockResult.rows,
        active_batches: batchResult.rows,
      },
    });
  } catch (err) {
    console.error('Items getById error:', err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * POST /api/items — Tambah barang baru
 */
const create = async (req, res) => {
  try {
    const {
      category_id, base_unit_id, name, sku, barcode,
      description, storage_notes, shelf_life_days,
      min_stock_qty = 0, max_stock_qty, cost_price = 0,
    } = req.body;

    if (!name || !sku || !base_unit_id) {
      return res.status(400).json({ status: 'error', message: 'Nama, SKU, dan satuan wajib diisi.' });
    }

    const result = await db.query(`
      INSERT INTO items
        (category_id, base_unit_id, name, sku, barcode, description, storage_notes,
         shelf_life_days, min_stock_qty, max_stock_qty, cost_price)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [category_id, base_unit_id, name, sku.toUpperCase(), barcode,
        description, storage_notes, shelf_life_days, min_stock_qty, max_stock_qty, cost_price]);

    return res.status(201).json({ status: 'success', message: 'Barang berhasil ditambahkan.', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'SKU atau barcode sudah digunakan.' });
    }
    console.error('Items create error:', err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * PUT /api/items/:id — Update barang
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id, base_unit_id, name, sku, barcode,
      description, storage_notes, shelf_life_days,
      min_stock_qty, max_stock_qty, cost_price, is_active,
    } = req.body;

    const result = await db.query(`
      UPDATE items SET
        category_id = COALESCE($1, category_id),
        base_unit_id = COALESCE($2, base_unit_id),
        name = COALESCE($3, name),
        sku = COALESCE($4, sku),
        barcode = COALESCE($5, barcode),
        description = COALESCE($6, description),
        storage_notes = COALESCE($7, storage_notes),
        shelf_life_days = COALESCE($8, shelf_life_days),
        min_stock_qty = COALESCE($9, min_stock_qty),
        max_stock_qty = COALESCE($10, max_stock_qty),
        cost_price = COALESCE($11, cost_price),
        is_active = COALESCE($12, is_active),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [category_id, base_unit_id, name, sku, barcode,
        description, storage_notes, shelf_life_days,
        min_stock_qty, max_stock_qty, cost_price, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Barang tidak ditemukan.' });
    }

    return res.status(200).json({ status: 'success', message: 'Barang berhasil diperbarui.', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'SKU atau barcode sudah digunakan.' });
    }
    console.error('Items update error:', err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/items/categories — Daftar semua kategori
 */
const getCategories = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM item_categories ORDER BY name');
    return res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/items/units — Daftar semua satuan
 */
const getUnits = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM units ORDER BY name');
    return res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { getAll, getById, create, update, getCategories, getUnits };
