const db = require('../../config/database');
const { generateDocNumber, postStockMovement } = require('../../utils/stock.utils');

/** GET /api/issues */
const getAll = async (req, res) => {
  try {
    const { warehouse_id, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (warehouse_id) { params.push(warehouse_id); conditions.push(`si.warehouse_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`si.status = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await db.query(`
      SELECT si.id, si.doc_number, si.status, si.issue_date, si.issue_type, si.notes,
             w.name AS warehouse_name, c.name AS customer_name, u.name AS issued_by_name,
             COUNT(sil.id) AS line_count
      FROM stock_issues si
      JOIN warehouses w ON w.id = si.warehouse_id
      LEFT JOIN customers c ON c.id = si.customer_id
      JOIN users u ON u.id = si.issued_by
      LEFT JOIN stock_issue_lines sil ON sil.issue_id = si.id
      ${where}
      GROUP BY si.id, w.name, c.name, u.name
      ORDER BY si.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), offset]);

    return res.json({ status: 'success', data: rows.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: req.t('issues.serverError') });
  }
};

/** GET /api/issues/:id */
const getById = async (req, res) => {
  try {
    const [header, lines] = await Promise.all([
      db.query(`
        SELECT si.*, w.name AS warehouse_name, c.name AS customer_name, u.name AS issued_by_name
        FROM stock_issues si
        JOIN warehouses w ON w.id = si.warehouse_id
        LEFT JOIN customers c ON c.id = si.customer_id
        JOIN users u ON u.id = si.issued_by
        WHERE si.id = $1
      `, [req.params.id]),
      db.query(`
        SELECT sil.*, i.name AS item_name, i.sku, un.symbol AS unit_symbol, b.batch_number, b.expiry_date
        FROM stock_issue_lines sil
        JOIN items i ON i.id = sil.item_id
        JOIN units un ON un.id = sil.unit_id
        LEFT JOIN batches b ON b.id = sil.batch_id
        WHERE sil.issue_id = $1
      `, [req.params.id]),
    ]);
    if (header.rows.length === 0) return res.status(404).json({ status: 'error', message: req.t('issues.notFound') });
    return res.json({ status: 'success', data: { ...header.rows[0], lines: lines.rows } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: req.t('issues.serverError') });
  }
};

/** POST /api/issues — Buat dokumen pengeluaran (draft) */
const create = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { warehouse_id, customer_id, issue_date, issue_type = 'delivery', notes, lines } = req.body;

    if (!warehouse_id || !lines || lines.length === 0) {
      return res.status(400).json({ status: 'error', message: req.t('issues.warehouseRequired') });
    }

    const docNumber = await generateDocNumber(client, 'SI');

    const headerResult = await client.query(`
      INSERT INTO stock_issues (doc_number, warehouse_id, customer_id, issued_by, issue_date, issue_type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [docNumber, warehouse_id, customer_id || null, req.user.id,
        issue_date || new Date().toISOString().split('T')[0], issue_type, notes]);

    const issue = headerResult.rows[0];

    for (const line of lines) {
      await client.query(`
        INSERT INTO stock_issue_lines (issue_id, item_id, unit_id, qty, location_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [issue.id, line.item_id, line.unit_id, line.qty, line.location_id || null]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ status: 'success', message: req.t('issues.created'), data: issue });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ status: 'error', message: req.t('issues.serverError') });
  } finally {
    client.release();
  }
};

/**
 * POST /api/issues/:id/confirm — KONFIRMASI pengeluaran dengan FEFO
 *
 * FEFO = First Expired First Out
 * Sistem otomatis memilih batch yang PALING DEKAT kadaluarsanya untuk dikeluarkan duluan.
 */
const confirm = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Ambil header + lines
    const issueResult = await client.query(`
      SELECT si.*, json_agg(json_build_object(
        'id', sil.id, 'item_id', sil.item_id, 'unit_id', sil.unit_id, 'qty', sil.qty
      )) AS lines
      FROM stock_issues si
      JOIN stock_issue_lines sil ON sil.issue_id = si.id
      WHERE si.id = $1 GROUP BY si.id
    `, [id]);

    if (issueResult.rows.length === 0) return res.status(404).json({ status: 'error', message: req.t('issues.notFound') });

    const issue = issueResult.rows[0];
    if (issue.status !== 'draft') {
      return res.status(400).json({ status: 'error', message: req.t('issues.alreadyConfirmed') });
    }

    // Proses setiap baris dengan FEFO
    for (const line of issue.lines) {
      let qtyNeeded = parseFloat(line.qty);

      // Cek stok cukup?
      const balanceResult = await client.query(
        `SELECT qty_on_hand FROM stock_balances WHERE item_id = $1 AND warehouse_id = $2`,
        [line.item_id, issue.warehouse_id]
      );
      const currentStock = balanceResult.rows.length > 0 ? parseFloat(balanceResult.rows[0].qty_on_hand) : 0;

      if (currentStock < qtyNeeded) {
        const itemResult = await client.query('SELECT name FROM items WHERE id = $1', [line.item_id]);
        throw new Error(`Stok ${itemResult.rows[0]?.name} tidak cukup. Tersedia: ${currentStock}, Dibutuhkan: ${qtyNeeded}`);
      }

      // Ambil batch sesuai FEFO: urutkan expiry_date ASC (paling dekat expire duluan)
      const batchesResult = await client.query(`
        SELECT id, batch_number, expiry_date, remaining_qty
        FROM batches
        WHERE item_id = $1 AND warehouse_id = $2 AND status = 'active' AND remaining_qty > 0
        ORDER BY expiry_date ASC NULLS LAST, created_at ASC
        FOR UPDATE
      `, [line.item_id, issue.warehouse_id]);

      // Keluarkan dari batch satu per satu (FEFO)
      for (const batch of batchesResult.rows) {
        if (qtyNeeded <= 0) break;

        const qtyFromBatch = Math.min(qtyNeeded, parseFloat(batch.remaining_qty));

        // Update remaining_qty batch
        await client.query(
          `UPDATE batches SET remaining_qty = remaining_qty - $1, updated_at = NOW() WHERE id = $2`,
          [qtyFromBatch, batch.id]
        );

        // Update issue line dengan batch yang digunakan
        await client.query(
          `UPDATE stock_issue_lines SET batch_id = $1 WHERE id = $2`,
          [batch.id, line.id]
        );

        // Update stock balance + ledger
        const balance = await client.query(
          'SELECT avg_cost_price FROM stock_balances WHERE item_id = $1 AND warehouse_id = $2',
          [line.item_id, issue.warehouse_id]
        );
        const avgCost = balance.rows.length > 0 ? balance.rows[0].avg_cost_price : 0;

        await postStockMovement(client, {
          item_id: line.item_id,
          warehouse_id: issue.warehouse_id,
          batch_id: batch.id,
          qty_out: qtyFromBatch,
          cost_price: avgCost,
          transaction_type: 'issue',
          reference_id: issue.id,
          reference_type: 'stock_issues',
          created_by: req.user.id,
        });

        qtyNeeded -= qtyFromBatch;
      }
    }

    // Konfirmasi dokumen
    await client.query(
      `UPDATE stock_issues SET status = 'confirmed', approved_by = $1, updated_at = NOW() WHERE id = $2`,
      [req.user.id, id]
    );

    await client.query('COMMIT');
    return res.json({ status: 'success', message: req.t('issues.confirmed') });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Issue confirm error:', err);
    return res.status(500).json({ status: 'error', message: err.message || req.t('issues.serverError') });
  } finally {
    client.release();
  }
};

/** PUT /api/issues/:id/cancel */
const cancel = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE stock_issues SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND status = 'draft' RETURNING doc_number`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(400).json({ status: 'error', message: req.t('issues.alreadyConfirmed') });
    return res.json({ status: 'success', message: req.t('issues.cancelled') });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: req.t('issues.serverError') });
  }
};

module.exports = { getAll, getById, create, confirm, cancel };
