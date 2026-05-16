const db = require('../../config/database');
const { saveExcelFile, getExportConfig, updateExportPath, openFolder } = require('../../utils/export.utils');

/**
 * GET /api/reports/stock-position — Posisi stok semua item per gudang
 * Query param: ?warehouse_id=xxx&export=excel
 */
const stockPosition = async (req, res) => {
  try {
    const { warehouse_id, export: doExport } = req.query;
    const params = [];
    const conditions = [];
    if (warehouse_id) { params.push(warehouse_id); conditions.push(`sb.warehouse_id = $${params.length}`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await db.query(`
      SELECT
        i.sku AS "SKU",
        i.name AS "Nama Barang",
        c.name AS "Kategori",
        un.symbol AS "Satuan",
        w.name AS "Gudang",
        sb.qty_on_hand AS "Qty On Hand",
        sb.qty_reserved AS "Qty Reserved",
        sb.qty_available AS "Qty Available",
        sb.avg_cost_price AS "HPP Rata-Rata",
        ROUND((sb.qty_on_hand * sb.avg_cost_price)::numeric, 0) AS "Nilai Stok (Rp)",
        CASE
          WHEN sb.qty_available <= 0 THEN 'Stockout'
          WHEN sb.qty_available <= i.min_stock_qty THEN 'Minimum'
          WHEN i.max_stock_qty IS NOT NULL AND sb.qty_on_hand > i.max_stock_qty THEN 'Overstock'
          ELSE 'Normal'
        END AS "Status"
      FROM stock_balances sb
      JOIN items i ON i.id = sb.item_id
      LEFT JOIN item_categories c ON c.id = i.category_id
      JOIN units un ON un.id = i.base_unit_id
      JOIN warehouses w ON w.id = sb.warehouse_id
      ${where}
      ORDER BY w.name, i.name
    `, params);

    if (doExport === 'excel') {
      const saved = await saveExcelFile(result.rows, 'Posisi Stok', 'posisi-stok', 'Posisi-Stok', req.query.custom_path);
      return res.json({ status: 'success', message: 'File berhasil disimpan.', export: saved });
    }
    return res.json({ status: 'success', data: result.rows, total: result.rows.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/reports/expiry — Laporan batch mendekati kadaluarsa
 * Query param: ?days=30&warehouse_id=xxx&export=excel
 */
const expiryReport = async (req, res) => {
  try {
    const { days = 30, warehouse_id, export: doExport } = req.query;
    const params = [parseInt(days)];
    const conditions = [`b.expiry_date <= CURRENT_DATE + $1`, `b.remaining_qty > 0`, `b.status = 'active'`];
    if (warehouse_id) { params.push(warehouse_id); conditions.push(`b.warehouse_id = $${params.length}`); }

    const result = await db.query(`
      SELECT
        b.batch_number AS "No. Batch",
        i.name AS "Nama Barang",
        i.sku AS "SKU",
        c.name AS "Kategori",
        w.name AS "Gudang",
        b.remaining_qty AS "Qty Sisa",
        un.symbol AS "Satuan",
        TO_CHAR(b.expiry_date, 'DD/MM/YYYY') AS "Tgl Kadaluarsa",
        (b.expiry_date - CURRENT_DATE) AS "Sisa Hari",
        CASE
          WHEN b.expiry_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN b.expiry_date <= CURRENT_DATE + 7 THEN 'KRITIS'
          WHEN b.expiry_date <= CURRENT_DATE + 30 THEN 'PERINGATAN'
          ELSE 'AMAN'
        END AS "Status"
      FROM batches b
      JOIN items i ON i.id = b.item_id
      LEFT JOIN item_categories c ON c.id = i.category_id
      JOIN units un ON un.id = i.base_unit_id
      JOIN warehouses w ON w.id = b.warehouse_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.expiry_date ASC
    `, params);

    if (doExport === 'excel') {
      const saved = await saveExcelFile(result.rows, 'Laporan Kadaluarsa', 'expiry', 'Laporan-Expiry', req.query.custom_path);
      return res.json({ status: 'success', message: 'File berhasil disimpan.', export: saved });
    }
    return res.json({ status: 'success', data: result.rows, total: result.rows.length });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/reports/stock-card — Kartu stok (riwayat mutasi) per item per gudang
 * Query param: ?item_id=xxx&warehouse_id=xxx&start_date=&end_date=&export=excel
 */
const stockCard = async (req, res) => {
  try {
    const { item_id, warehouse_id, start_date, end_date, export: doExport } = req.query;
    if (!item_id || !warehouse_id) {
      return res.status(400).json({ status: 'error', message: 'item_id dan warehouse_id wajib diisi.' });
    }
    const params = [item_id, warehouse_id];
    const conditions = [`sl.item_id = $1`, `sl.warehouse_id = $2`];
    if (start_date) { params.push(start_date); conditions.push(`sl.posted_at >= $${params.length}`); }
    if (end_date) { params.push(end_date + ' 23:59:59'); conditions.push(`sl.posted_at <= $${params.length}`); }

    const result = await db.query(`
      SELECT
        TO_CHAR(sl.posted_at, 'DD/MM/YYYY HH24:MI') AS "Tanggal",
        sl.transaction_type AS "Jenis",
        sl.reference_type AS "Referensi",
        b.batch_number AS "No. Batch",
        sl.qty_in AS "Masuk",
        sl.qty_out AS "Keluar",
        sl.running_balance AS "Saldo",
        sl.cost_price AS "HPP",
        u.name AS "Oleh"
      FROM stock_ledger sl
      LEFT JOIN batches b ON b.id = sl.batch_id
      LEFT JOIN users u ON u.id = sl.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY sl.posted_at ASC
    `, params);

    if (doExport === 'excel') {
      const saved = await saveExcelFile(result.rows, 'Kartu Stok', 'kartu-stok', 'Kartu-Stok', req.query.custom_path);
      return res.json({ status: 'success', message: 'File berhasil disimpan.', export: saved });
    }
    return res.json({ status: 'success', data: result.rows, total: result.rows.length });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/**
 * GET /api/reports/dashboard — Ringkasan untuk halaman Dashboard
 */
const dashboard = async (req, res) => {
  try {
    const [items, warehouses, batchSummary, stockValue, recentTx] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM items WHERE is_active = true`),
      db.query(`SELECT COUNT(*) AS total FROM warehouses WHERE is_active = true`),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) AS expired,
          COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + 7) AS critical,
          COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + 7 AND expiry_date <= CURRENT_DATE + 30) AS warning,
          COUNT(*) FILTER (WHERE expiry_date > CURRENT_DATE + 30 OR expiry_date IS NULL) AS safe
        FROM batches WHERE remaining_qty > 0 AND status = 'active'
      `),
      db.query(`SELECT COALESCE(SUM(qty_on_hand * avg_cost_price), 0) AS total FROM stock_balances`),
      db.query(`
        SELECT 'receipt' AS type, doc_number, receipt_date AS doc_date, status, created_at FROM stock_receipts
        UNION ALL
        SELECT 'issue', doc_number, issue_date, status, created_at FROM stock_issues
        UNION ALL
        SELECT 'transfer', doc_number, transfer_date, status, created_at FROM stock_transfers
        ORDER BY created_at DESC LIMIT 10
      `),
    ]);

    return res.json({
      status: 'success',
      data: {
        total_items: parseInt(items.rows[0].total),
        total_warehouses: parseInt(warehouses.rows[0].total),
        batch_summary: batchSummary.rows[0],
        total_stock_value: parseFloat(stockValue.rows[0].total),
        recent_transactions: recentTx.rows,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};


/** GET /api/reports/export-settings — Ambil konfigurasi export saat ini */
const getExportSettings = async (req, res) => {
  try {
    const config = await getExportConfig();
    const result = await db.query(`SELECT key, value, description FROM app_settings ORDER BY key`);
    return res.json({ status: 'success', data: { config, settings: result.rows } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** PUT /api/reports/export-settings — Update export path */
const updateExportSettings = async (req, res) => {
  try {
    const { export_path } = req.body;
    if (!export_path) {
      return res.status(400).json({ status: 'error', message: 'export_path wajib diisi.' });
    }
    const newPath = await updateExportPath(export_path, req.user.id);
    return res.json({ status: 'success', message: `Path export diubah ke: ${newPath}`, data: { path: newPath } });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

/** POST /api/reports/open-folder — Buka folder export di Windows Explorer */
const openExportFolder = async (req, res) => {
  try {
    const { folder_path } = req.body;
    const config = await getExportConfig();
    const targetPath = folder_path || config.basePath;
    const opened = openFolder(targetPath);
    if (!opened) {
      return res.status(404).json({ status: 'error', message: `Folder tidak ditemukan: ${targetPath}` });
    }
    return res.json({ status: 'success', message: 'Folder dibuka di Windows Explorer.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { stockPosition, expiryReport, stockCard, dashboard, getExportSettings, updateExportSettings, openExportFolder };
