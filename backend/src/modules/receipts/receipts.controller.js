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
               COALESCE(s.name, sr.supplier_name_text) AS supplier_name,
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
    return res.status(500).json({ status: 'error', message: req.t('receipts.serverError') });
  }
};

/** GET /api/receipts/:id — Detail penerimaan + baris */
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const [header, lines] = await Promise.all([
      db.query(`
        SELECT sr.*, w.name AS warehouse_name, COALESCE(s.name, sr.supplier_name_text) AS supplier_name,
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
               b.batch_number, b.expiry_date, b.manufacture_date
        FROM stock_receipt_lines srl
        JOIN items i ON i.id = srl.item_id
        JOIN units un ON un.id = srl.unit_id
        LEFT JOIN batches b ON b.receipt_line_id = srl.id
        WHERE srl.receipt_id = $1
        ORDER BY srl.created_at
      `, [id]),
    ]);

    if (header.rows.length === 0) return res.status(404).json({ status: 'error', message: req.t('receipts.notFound') });

    return res.json({ status: 'success', data: { ...header.rows[0], lines: lines.rows } });
  } catch (err) {
    console.error('getById error:', err);
    return res.status(500).json({ status: 'error', message: req.t('receipts.serverError') });
  }
};


/** POST /api/receipts — Buat dokumen penerimaan baru */
const create = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const {
      warehouse_id, supplier_id, supplier_name,
      receipt_date, notes, lines, confirm_immediately,
    } = req.body;

    if (!warehouse_id || !lines || lines.length === 0) {
      return res.status(400).json({ status: 'error', message: req.t('receipts.warehouseRequired') });
    }

    // ── Resolve supplier_id dari nama jika perlu ─────────────
    let resolvedSupplierId = supplier_id || null;
    if (!resolvedSupplierId && supplier_name && supplier_name.trim()) {
      // Cari dulu, jika tidak ada → buat baru
      const sRes = await client.query(
        `SELECT id FROM suppliers WHERE name ILIKE $1 LIMIT 1`, [supplier_name.trim()]
      );
      if (sRes.rows.length > 0) {
        resolvedSupplierId = sRes.rows[0].id;
      } else {
        // Auto-create supplier dengan kode otomatis
        const autoCode = 'SUP-' + supplier_name.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8) + '-' + Date.now().toString().slice(-4);
        const newS = await client.query(
          `INSERT INTO suppliers (name, code) VALUES ($1, $2) RETURNING id`,
          [supplier_name.trim(), autoCode]
        );
        resolvedSupplierId = newS.rows[0].id;
      }
    }

    // ── Proses dan validasi setiap baris ─────────────────────
    const processedLines = [];
    for (const line of lines) {
      const itemId    = line.item_id;
      const qty       = parseFloat(line.qty ?? line.qty_received ?? 0);
      const costPrice = parseFloat(line.cost_price ?? line.unit_cost ?? 0);

      if (!itemId || qty <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Setiap baris harus memiliki barang dan qty > 0.',
        });
      }

      // Auto-resolve unit_id dari base_unit_id item
      let unitId = line.unit_id || null;
      if (!unitId) {
        const itemRes = await client.query(
          `SELECT base_unit_id FROM items WHERE id = $1`, [itemId]
        );
        if (itemRes.rows.length === 0) {
          const notFoundErr = new Error(`Item dengan id ${itemId} tidak ditemukan.`);
          notFoundErr.statusCode = 400;
          throw notFoundErr;
        }
        unitId = itemRes.rows[0].base_unit_id;
      }

      processedLines.push({
        item_id:      itemId,
        unit_id:      unitId,
        qty,
        cost_price:   costPrice,
        batch_number: line.batch_number || null,
        expiry_date:  line.expiry_date  || null,
        mfg_date:     line.mfg_date     || null,
      });
    }

    // ── Buat header dokumen ───────────────────────────────────
    const docNumber = await generateDocNumber(client, 'SR');
    const headerResult = await client.query(`
      INSERT INTO stock_receipts
        (doc_number, warehouse_id, supplier_id, supplier_name_text, received_by, receipt_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      docNumber, warehouse_id, resolvedSupplierId,
      supplier_name ? supplier_name.trim() : null,
      req.user.id,
      receipt_date || new Date().toISOString().split('T')[0],
      notes || null,
    ]);

    const receipt = headerResult.rows[0];

    // ── Insert baris ──────────────────────────────────────────
    const lineResults = [];
    for (const line of processedLines) {
      const lr = await client.query(`
        INSERT INTO stock_receipt_lines
          (receipt_id, item_id, unit_id, qty, cost_price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [receipt.id, line.item_id, line.unit_id, line.qty, line.cost_price]);
      lineResults.push({ ...line, id: lr.rows[0].id });
    }

    // ── Jika confirm_immediately: buat batch + update stok ───
    if (confirm_immediately) {
      for (const line of lineResults) {
        // Validasi batch jika langsung konfirmasi
        if (!line.batch_number || !line.expiry_date) {
          const batchErr = new Error(`No. Batch dan Tanggal Kadaluarsa wajib diisi untuk setiap baris saat konfirmasi langsung.`);
          batchErr.statusCode = 400;
          throw batchErr;
        }

        const batchResult = await client.query(`
          INSERT INTO batches
            (receipt_line_id, item_id, warehouse_id, batch_number,
             manufacture_date, expiry_date, initial_qty, remaining_qty, cost_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8)
          ON CONFLICT (batch_number, item_id, warehouse_id)
          DO UPDATE SET remaining_qty = batches.remaining_qty + $7, updated_at = NOW()
          RETURNING id
        `, [
          line.id, line.item_id, warehouse_id,
          line.batch_number, line.mfg_date || null,
          line.expiry_date, line.qty, line.cost_price,
        ]);

        await postStockMovement(client, {
          item_id:          line.item_id,
          warehouse_id:     warehouse_id,
          batch_id:         batchResult.rows[0].id,
          qty_in:           line.qty,
          cost_price:       line.cost_price,
          transaction_type: 'receipt',
          reference_id:     receipt.id,
          reference_type:   'stock_receipts',
          created_by:       req.user.id,
        });
      }

      await client.query(
        `UPDATE stock_receipts SET status = 'confirmed', approved_by = $1, updated_at = NOW() WHERE id = $2`,
        [req.user.id, receipt.id]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({
      status: 'success',
      message: confirm_immediately
        ? req.t('receipts.confirmed')
        : req.t('receipts.created'),
      data: { ...receipt, status: confirm_immediately ? 'confirmed' : 'draft' },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    const statusCode = err.statusCode || 500;
    if (statusCode === 500) console.error('Receipt create error:', err);
    return res.status(statusCode).json({ status: 'error', message: err.message || req.t('receipts.serverError') });
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
      return res.status(404).json({ status: 'error', message: req.t('receipts.notFound') });
    }

    const receipt = receiptResult.rows[0];
    if (receipt.status !== 'draft') {
      return res.status(400).json({ status: 'error', message: req.t('receipts.alreadyConfirmed') });
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
        const batchErr = new Error(`No. batch untuk baris item_id ${line.item_id} tidak ditemukan.`);
        batchErr.statusCode = 400;
        throw batchErr;
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
    return res.json({ status: 'success', message: req.t('receipts.confirmed') });
  } catch (err) {
    await client.query('ROLLBACK');
    const statusCode = err.statusCode || 500;
    if (statusCode === 500) console.error('Receipt confirm error:', err);
    return res.status(statusCode).json({ status: 'error', message: err.message || req.t('receipts.serverError') });
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
      return res.status(400).json({ status: 'error', message: req.t('receipts.alreadyConfirmed') });
    }
    return res.json({ status: 'success', message: req.t('receipts.cancelled') });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: req.t('receipts.serverError') });
  }
};

module.exports = { getAll, getById, create, confirm, cancel };
