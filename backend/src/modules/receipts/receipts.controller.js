const db = require('../../config/database');
const { generateDocNumber, postStockMovement } = require('../../utils/stock.utils');

/** GET /api/receipts — Daftar semua penerimaan */
const getAll = async (req, res) => {
  try {
    const { warehouse_id, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (warehouse_id) { params.push(warehouse_id); conditions.push(`sr.warehouse_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`sr.status = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows, count] = await Promise.all([
      db.query(`
        SELECT sr.id, sr.doc_number, sr.status, sr.receipt_date, sr.notes,
               w.name AS warehouse_name,
               s.name AS supplier_name,
               u.name AS received_by_name,
               COUNT(srl.id) AS line_count,
               SUM(srl.qty * srl.cost_price) AS total_value
        FROM stock_receipts sr
        JOIN warehouses w ON w.id = sr.warehouse_id
        LEFT JOIN suppliers s ON s.id = sr.supplier_id
        JOIN users u ON u.id = sr.received_by
        LEFT JOIN stock_receipt_lines srl ON srl.receipt_id = sr.id
        ${where}
        GROUP BY sr.id, w.name, s.name, u.name
        ORDER BY sr.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), offset]),
      db.query(`SELECT COUNT(*) FROM stock_receipts sr ${where}`, params),
    ]);

    return res.json({
      status: 'success',
      data: rows.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count.rows[0].count) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** GET /api/receipts/:id — Detail penerimaan + baris */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const [header, lines] = await Promise.all([
      db.query(`
        SELECT sr.*, w.name AS warehouse_name, s.name AS supplier_name,
               u.name AS received_by_name, a.name AS approved_by_name
        FROM stock_receipts sr
        JOIN warehouses w ON w.id = sr.warehouse_id
        LEFT JOIN suppliers s ON s.id = sr.supplier_id
        JOIN users u ON u.id = sr.received_by
        LEFT JOIN users a ON a.id = sr.approved_by
        WHERE sr.id = $1
      `, [id]),
      db.query(`
        SELECT srl.*, i.name AS item_name, i.sku, un.symbol AS unit_symbol,
               wl.zone, wl.rack, wl.bin
        FROM stock_receipt_lines srl
        JOIN items i ON i.id = srl.item_id
        JOIN units un ON un.id = srl.unit_id
        LEFT JOIN warehouse_locations wl ON wl.id = srl.location_id
        WHERE srl.receipt_id = $1
        ORDER BY srl.created_at
      `, [id]),
    ]);

    if (header.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Dokumen tidak ditemukan.' });

    return res.json({ status: 'success', data: { ...header.rows[0], lines: lines.rows } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** POST /api/receipts — Buat dokumen penerimaan baru (status: draft) */
const create = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { warehouse_id, supplier_id, receipt_date, notes, lines } = req.body;

    if (!warehouse_id || !lines || lines.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Gudang dan minimal 1 baris barang wajib diisi.' });
    }

    // Validasi setiap baris
    for (const line of lines) {
      if (!line.item_id || !line.unit_id || !line.qty || line.qty <= 0) {
        return res.status(400).json({ status: 'error', message: 'Setiap baris harus memiliki barang, satuan, dan qty > 0.' });
      }
      if (!line.batch_number || !line.expiry_date) {
        return res.status(400).json({ status: 'error', message: 'No. Batch dan Tanggal Expire wajib diisi untuk setiap baris.' });
      }
    }

    const docNumber = await generateDocNumber(client, 'SR');

    // Insert header
    const headerResult = await client.query(`
      INSERT INTO stock_receipts (doc_number, warehouse_id, supplier_id, received_by, receipt_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [docNumber, warehouse_id, supplier_id || null, req.user.id,
        receipt_date || new Date().toISOString().split('T')[0], notes]);

    const receipt = headerResult.rows[0];

    // Insert baris-baris
    for (const line of lines) {
      await client.query(`
        INSERT INTO stock_receipt_lines
          (receipt_id, item_id, unit_id, qty, cost_price, location_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [receipt.id, line.item_id, line.unit_id, line.qty,
          line.cost_price || 0, line.location_id || null]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ status: 'success', message: `Dokumen ${docNumber} berhasil dibuat.`, data: receipt });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Receipt create error:', err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/receipts/:id/confirm — KONFIRMASI penerimaan
 *
 * Ini adalah proses terpenting:
 * 1. Buat Batch baru untuk setiap baris
 * 2. Update stock_balances (AVCO)
 * 3. Catat ke stock_ledger
 * 4. Ubah status jadi 'confirmed'
 */
const confirm = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Cek dokumen & statusnya
    const receiptResult = await client.query(
      `SELECT sr.*, json_agg(
        json_build_object(
          'id', srl.id, 'item_id', srl.item_id, 'unit_id', srl.unit_id,
          'qty', srl.qty, 'cost_price', srl.cost_price, 'location_id', srl.location_id
        )
      ) AS lines
      FROM stock_receipts sr
      JOIN stock_receipt_lines srl ON srl.receipt_id = sr.id
      WHERE sr.id = $1 GROUP BY sr.id`,
      [id]
    );

    if (receiptResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Dokumen tidak ditemukan.' });
    }

    const receipt = receiptResult.rows[0];
    if (receipt.status !== 'draft') {
      return res.status(400).json({ status: 'error', message: `Dokumen sudah berstatus '${receipt.status}', tidak bisa dikonfirmasi ulang.` });
    }

    // Ambil info batch dari request body (batch_number, expiry_date per line)
    const { line_batches } = req.body; // [{receipt_line_id, batch_number, manufacture_date, expiry_date}]

    if (!line_batches || line_batches.length !== receipt.lines.length) {
      return res.status(400).json({ status: 'error', message: 'Data batch (no. batch & tgl expire) wajib diisi untuk setiap baris.' });
    }

    // Buat map batch berdasarkan receipt_line_id
    const batchMap = {};
    for (const lb of line_batches) {
      batchMap[lb.receipt_line_id] = lb;
    }

    // Proses setiap baris
    for (const line of receipt.lines) {
      const batchInfo = batchMap[line.id];
      if (!batchInfo || !batchInfo.batch_number) {
        throw new Error(`No. batch untuk baris item_id ${line.item_id} tidak ditemukan.`);
      }

      // ── Buat Batch ──────────────────────────────────────
      const batchResult = await client.query(`
        INSERT INTO batches
          (receipt_line_id, item_id, warehouse_id, batch_number,
           manufacture_date, expiry_date, initial_qty, remaining_qty, cost_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
        ON CONFLICT (batch_number, item_id, warehouse_id) DO UPDATE SET
          remaining_qty = batches.remaining_qty + $7,
          updated_at = NOW()
        RETURNING id
      `, [
        line.id, line.item_id, receipt.warehouse_id,
        batchInfo.batch_number, batchInfo.manufacture_date || null,
        batchInfo.expiry_date || null, line.qty, line.cost_price,
      ]);

      const batchId = batchResult.rows[0].id;

      // ── Update Stock Balance + Ledger (AVCO) ────────────
      await postStockMovement(client, {
        item_id: line.item_id,
        warehouse_id: receipt.warehouse_id,
        batch_id: batchId,
        qty_in: line.qty,
        cost_price: line.cost_price,
        transaction_type: 'receipt',
        reference_id: receipt.id,
        reference_type: 'stock_receipts',
        created_by: req.user.id,
      });
    }

    // Ubah status jadi confirmed
    await client.query(
      `UPDATE stock_receipts SET status = 'confirmed', approved_by = $1, updated_at = NOW() WHERE id = $2`,
      [req.user.id, id]
    );

    await client.query('COMMIT');
    return res.json({ status: 'success', message: `Penerimaan ${receipt.doc_number} dikonfirmasi. Stok berhasil diperbarui.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Receipt confirm error:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }
};

/** DELETE/PUT /api/receipts/:id/cancel — Batalkan dokumen draft */
const cancel = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE stock_receipts SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status = 'draft' RETURNING doc_number`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Dokumen tidak ditemukan atau sudah dikonfirmasi (tidak bisa dibatalkan).' });
    }
    return res.json({ status: 'success', message: `Dokumen ${result.rows[0].doc_number} dibatalkan.` });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

module.exports = { getAll, getById, create, confirm, cancel };
