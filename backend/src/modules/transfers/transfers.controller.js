const db = require('../../config/database');
const { generateDocNumber, postStockMovement } = require('../../utils/stock.utils');

/** GET /api/transfers */
const getAll = async (req, res) => {
  try {
    const { warehouse_id, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (warehouse_id) {
      params.push(warehouse_id);
      conditions.push(`(st.from_warehouse_id = $${params.length} OR st.to_warehouse_id = $${params.length})`);
    }
    if (status) { params.push(status); conditions.push(`st.status = $${params.length}`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const rows = await db.query(`
      SELECT st.id, st.doc_number, st.status, st.transfer_date, st.notes,
             fw.name AS from_warehouse_name, tw.name AS to_warehouse_name,
             u.name AS requested_by_name,
             COUNT(stl.id) AS line_count
      FROM stock_transfers st
      JOIN warehouses fw ON fw.id = st.from_warehouse_id
      JOIN warehouses tw ON tw.id = st.to_warehouse_id
      JOIN users u ON u.id = st.requested_by
      LEFT JOIN stock_transfer_lines stl ON stl.transfer_id = st.id
      ${where}
      GROUP BY st.id, fw.name, tw.name, u.name
      ORDER BY st.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), offset]);

    return res.json({ status: 'success', data: rows.rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** GET /api/transfers/:id */
const getById = async (req, res) => {
  try {
    const [header, lines] = await Promise.all([
      db.query(`
        SELECT st.*, fw.name AS from_warehouse_name, tw.name AS to_warehouse_name,
               u.name AS requested_by_name, a.name AS approved_by_name
        FROM stock_transfers st
        JOIN warehouses fw ON fw.id = st.from_warehouse_id
        JOIN warehouses tw ON tw.id = st.to_warehouse_id
        JOIN users u ON u.id = st.requested_by
        LEFT JOIN users a ON a.id = st.approved_by
        WHERE st.id = $1
      `, [req.params.id]),
      db.query(`
        SELECT stl.*, i.name AS item_name, i.sku, un.symbol AS unit_symbol,
               b.batch_number, b.expiry_date
        FROM stock_transfer_lines stl
        JOIN items i ON i.id = stl.item_id
        JOIN units un ON un.id = stl.unit_id
        LEFT JOIN batches b ON b.id = stl.batch_id
        WHERE stl.transfer_id = $1
      `, [req.params.id]),
    ]);
    if (header.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Dokumen tidak ditemukan.' });
    return res.json({ status: 'success', data: { ...header.rows[0], lines: lines.rows } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  }
};

/** POST /api/transfers — Buat dokumen transfer (draft) */
const create = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { from_warehouse_id, to_warehouse_id, transfer_date, notes, lines } = req.body;

    if (!from_warehouse_id || !to_warehouse_id || !lines || lines.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Gudang asal, tujuan, dan minimal 1 baris wajib diisi.' });
    }
    if (from_warehouse_id === to_warehouse_id) {
      return res.status(400).json({ status: 'error', message: 'Gudang asal dan tujuan tidak boleh sama.' });
    }

    const docNumber = await generateDocNumber(client, 'ST');

    const headerResult = await client.query(`
      INSERT INTO stock_transfers (doc_number, from_warehouse_id, to_warehouse_id, requested_by, transfer_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [docNumber, from_warehouse_id, to_warehouse_id, req.user.id,
        transfer_date || new Date().toISOString().split('T')[0], notes]);

    const transfer = headerResult.rows[0];
    for (const line of lines) {
      await client.query(`
        INSERT INTO stock_transfer_lines (transfer_id, item_id, unit_id, qty_sent)
        VALUES ($1, $2, $3, $4)
      `, [transfer.id, line.item_id, line.unit_id, line.qty]);
    }

    await client.query('COMMIT');
    return res.status(201).json({ status: 'success', message: `Transfer ${docNumber} berhasil dibuat.`, data: transfer });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/transfers/:id/dispatch — KIRIM transfer (stok keluar dari gudang asal)
 * Menggunakan FEFO untuk memilih batch yang dikirim
 */
const dispatch = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const transferResult = await client.query(`
      SELECT st.*, json_agg(json_build_object(
        'id', stl.id, 'item_id', stl.item_id, 'unit_id', stl.unit_id, 'qty_sent', stl.qty_sent
      )) AS lines
      FROM stock_transfers st
      JOIN stock_transfer_lines stl ON stl.transfer_id = st.id
      WHERE st.id = $1 GROUP BY st.id
    `, [id]);

    if (transferResult.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Dokumen tidak ditemukan.' });
    const transfer = transferResult.rows[0];

    if (transfer.status !== 'draft') {
      return res.status(400).json({ status: 'error', message: `Status '${transfer.status}' tidak bisa dikirim.` });
    }

    // Proses setiap baris — FEFO dari gudang asal
    for (const line of transfer.lines) {
      let qtyNeeded = parseFloat(line.qty_sent);

      // Cek stok cukup di gudang asal
      const balResult = await client.query(
        `SELECT qty_on_hand FROM stock_balances WHERE item_id = $1 AND warehouse_id = $2`,
        [line.item_id, transfer.from_warehouse_id]
      );
      const available = balResult.rows.length > 0 ? parseFloat(balResult.rows[0].qty_on_hand) : 0;
      if (available < qtyNeeded) {
        const item = await client.query('SELECT name FROM items WHERE id = $1', [line.item_id]);
        throw new Error(`Stok ${item.rows[0]?.name} di gudang asal tidak cukup. Tersedia: ${available}, Dibutuhkan: ${qtyNeeded}`);
      }

      // FEFO: pilih batch terdekat expire dari gudang asal
      const batchesResult = await client.query(`
        SELECT id, remaining_qty, cost_price FROM batches
        WHERE item_id = $1 AND warehouse_id = $2 AND status = 'active' AND remaining_qty > 0
        ORDER BY expiry_date ASC NULLS LAST, created_at ASC
        FOR UPDATE
      `, [line.item_id, transfer.from_warehouse_id]);

      let batchIdUsed = null;
      for (const batch of batchesResult.rows) {
        if (qtyNeeded <= 0) break;
        const qtyFromBatch = Math.min(qtyNeeded, parseFloat(batch.remaining_qty));

        // Kurangi batch di gudang asal
        await client.query(
          `UPDATE batches SET remaining_qty = remaining_qty - $1, updated_at = NOW() WHERE id = $2`,
          [qtyFromBatch, batch.id]
        );

        // Update transfer line dengan batch yang digunakan
        await client.query(
          `UPDATE stock_transfer_lines SET batch_id = $1 WHERE id = $2`,
          [batch.id, line.id]
        );
        batchIdUsed = batch.id;

        // Ledger: stok keluar dari gudang asal
        await postStockMovement(client, {
          item_id: line.item_id,
          warehouse_id: transfer.from_warehouse_id,
          batch_id: batch.id,
          qty_out: qtyFromBatch,
          cost_price: batch.cost_price,
          transaction_type: 'transfer_out',
          reference_id: transfer.id,
          reference_type: 'stock_transfers',
          created_by: req.user.id,
        });

        qtyNeeded -= qtyFromBatch;
      }
    }

    await client.query(
      `UPDATE stock_transfers SET status = 'in_transit', approved_by = $1, updated_at = NOW() WHERE id = $2`,
      [req.user.id, id]
    );

    await client.query('COMMIT');
    return res.json({ status: 'success', message: `Transfer ${transfer.doc_number} dikirim. Stok gudang asal berkurang.` });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ status: 'error', message: err.message || 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/transfers/:id/receive — TERIMA transfer (stok masuk ke gudang tujuan)
 */
const receive = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const transferResult = await client.query(`
      SELECT st.*, json_agg(json_build_object(
        'id', stl.id, 'item_id', stl.item_id, 'unit_id', stl.unit_id,
        'qty_sent', stl.qty_sent, 'batch_id', stl.batch_id
      )) AS lines
      FROM stock_transfers st
      JOIN stock_transfer_lines stl ON stl.transfer_id = st.id
      WHERE st.id = $1 GROUP BY st.id
    `, [id]);

    if (transferResult.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Dokumen tidak ditemukan.' });
    const transfer = transferResult.rows[0];

    if (transfer.status !== 'in_transit') {
      return res.status(400).json({ status: 'error', message: `Status harus 'in_transit' untuk diterima. Status saat ini: '${transfer.status}'.` });
    }

    const { qty_received_lines } = req.body; // [{transfer_line_id, qty_received}]
    const qtyMap = {};
    if (qty_received_lines) {
      for (const ql of qty_received_lines) qtyMap[ql.transfer_line_id] = ql.qty_received;
    }

    for (const line of transfer.lines) {
      const qtyReceived = qtyMap[line.id] || line.qty_sent; // default: semua diterima

      // Update qty_received di transfer line
      await client.query(
        `UPDATE stock_transfer_lines SET qty_received = $1 WHERE id = $2`,
        [qtyReceived, line.id]
      );

      if (qtyReceived <= 0) continue;

      // Ambil info batch asal untuk copy ke gudang tujuan
      const batchInfo = await client.query(
        `SELECT batch_number, expiry_date, manufacture_date, cost_price FROM batches WHERE id = $1`,
        [line.batch_id]
      );

      const batch = batchInfo.rows[0];

      // Buat/update batch di gudang TUJUAN (batch number sama, gudang berbeda)
      const newBatchResult = await client.query(`
        INSERT INTO batches (item_id, warehouse_id, batch_number, manufacture_date, expiry_date, initial_qty, remaining_qty, cost_price)
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7)
        ON CONFLICT (batch_number, item_id, warehouse_id) DO UPDATE SET
          remaining_qty = batches.remaining_qty + $6, updated_at = NOW()
        RETURNING id
      `, [line.item_id, transfer.to_warehouse_id, batch.batch_number,
          batch.manufacture_date, batch.expiry_date, qtyReceived, batch.cost_price]);

      // Ledger: stok masuk ke gudang tujuan
      await postStockMovement(client, {
        item_id: line.item_id,
        warehouse_id: transfer.to_warehouse_id,
        batch_id: newBatchResult.rows[0].id,
        qty_in: qtyReceived,
        cost_price: batch.cost_price,
        transaction_type: 'transfer_in',
        reference_id: transfer.id,
        reference_type: 'stock_transfers',
        created_by: req.user.id,
      });
    }

    await client.query(
      `UPDATE stock_transfers SET status = 'received', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    return res.json({ status: 'success', message: `Transfer ${transfer.doc_number} diterima. Stok gudang tujuan bertambah.` });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ status: 'error', message: err.message || 'Terjadi kesalahan server.' });
  } finally {
    client.release();
  }
};

module.exports = { getAll, getById, create, dispatch, receive };
