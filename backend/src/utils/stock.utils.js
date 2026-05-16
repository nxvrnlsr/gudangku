const db = require('../config/database');

/**
 * Generate nomor dokumen otomatis
 * Format: [PREFIX]-[YYYY]-[MM]-[XXXX]
 * Contoh: SR-2026-05-0001 (Stock Receipt), SI-2026-05-0001 (Stock Issue)
 */
const generateDocNumber = async (client, prefix) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Tentukan tabel dan kolom berdasarkan prefix
  const tableMap = {
    'SR': 'stock_receipts',
    'SI': 'stock_issues',
    'ST': 'stock_transfers',
    'SA': 'stock_adjustments',
    'SO': 'opname_sessions',
  };
  const table = tableMap[prefix];

  // Hitung jumlah dokumen bulan ini untuk sequence number
  const result = await client.query(
    `SELECT COUNT(*) FROM ${table}
     WHERE doc_number LIKE $1`,
    [`${prefix}-${year}-${month}-%`]
  );

  const seq = String(parseInt(result.rows[0].count) + 1).padStart(4, '0');
  return `${prefix}-${year}-${month}-${seq}`;
};

/**
 * Update saldo stok menggunakan metode AVCO (Average Cost)
 * dan catat ke stock_ledger — semua dalam satu transaksi DB
 *
 * @param {object} client - PostgreSQL client (dalam transaksi)
 * @param {object} params
 *   - item_id, warehouse_id, batch_id
 *   - qty_in / qty_out (salah satu)
 *   - cost_price - harga per unit
 *   - transaction_type - jenis transaksi ('receipt', 'issue', dll)
 *   - reference_id - ID dokumen sumber
 *   - reference_type - Nama tabel sumber ('stock_receipts', dll)
 *   - created_by - user ID
 */
const postStockMovement = async (client, params) => {
  const {
    item_id, warehouse_id, batch_id,
    qty_in = 0, qty_out = 0,
    cost_price = 0,
    transaction_type, reference_id, reference_type,
    created_by,
  } = params;

  // ── 1. Ambil saldo saat ini ──────────────────────────────
  const balanceResult = await client.query(
    `SELECT qty_on_hand, avg_cost_price
     FROM stock_balances WHERE item_id = $1 AND warehouse_id = $2
     FOR UPDATE`,
    [item_id, warehouse_id]
  );

  let currentQty = 0;
  let currentAvgCost = 0;

  if (balanceResult.rows.length > 0) {
    currentQty = parseFloat(balanceResult.rows[0].qty_on_hand);
    currentAvgCost = parseFloat(balanceResult.rows[0].avg_cost_price);
  }

  // ── 2. Hitung saldo baru ─────────────────────────────────
  const newQty = currentQty + parseFloat(qty_in) - parseFloat(qty_out);

  // AVCO: hanya dihitung ulang saat ada barang masuk
  let newAvgCost = currentAvgCost;
  if (qty_in > 0 && cost_price > 0) {
    const totalValue = (currentQty * currentAvgCost) + (parseFloat(qty_in) * parseFloat(cost_price));
    const totalQty = currentQty + parseFloat(qty_in);
    newAvgCost = totalQty > 0 ? totalValue / totalQty : cost_price;
  }

  // ── 3. Upsert stock_balances ─────────────────────────────
  await client.query(`
    INSERT INTO stock_balances (item_id, warehouse_id, qty_on_hand, avg_cost_price, last_updated)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (item_id, warehouse_id) DO UPDATE SET
      qty_on_hand = $3,
      avg_cost_price = $4,
      last_updated = NOW()
  `, [item_id, warehouse_id, newQty, newAvgCost]);

  // ── 4. Catat ke stock_ledger (IMMUTABLE) ─────────────────
  await client.query(`
    INSERT INTO stock_ledger
      (item_id, warehouse_id, batch_id, transaction_type,
       reference_id, reference_type, qty_in, qty_out,
       running_balance, cost_price, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [
    item_id, warehouse_id, batch_id || null,
    transaction_type, reference_id, reference_type,
    qty_in, qty_out, newQty,
    cost_price || newAvgCost,
    created_by,
  ]);

  return { newQty, newAvgCost };
};

module.exports = { generateDocNumber, postStockMovement };
