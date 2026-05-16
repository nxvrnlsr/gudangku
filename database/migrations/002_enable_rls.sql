-- ============================================================
-- GudangKu Security Migration
-- File: 002_enable_rls.sql
-- Deskripsi: Aktifkan Row Level Security (RLS) di semua tabel
--            + buat policy keamanan
-- ============================================================

-- ============================================================
-- BAGIAN 1: AKTIFKAN RLS DI SEMUA 27 TABEL
-- ============================================================

ALTER TABLE roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE units                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_unit_conversions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_receipts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_receipt_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_issues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_issue_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE opname_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE opname_lines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BAGIAN 2: BUAT POLICY — HANYA BACKEND (postgres role) YANG BOLEH AKSES
--
-- Penjelasan:
-- - User 'postgres' adalah akun yang digunakan backend Node.js kita
-- - Supabase anon/authenticated role (dari browser) TIDAK termasuk
-- - Artinya: hanya backend kita yang bisa baca/tulis, bukan siapapun
--   yang coba akses Supabase langsung dari browser
-- ============================================================

-- Helper: buat policy untuk satu tabel sekaligus (ALL = SELECT+INSERT+UPDATE+DELETE)
-- Format: CREATE POLICY "backend_access" ON [tabel] TO postgres USING (true);

CREATE POLICY "backend_only" ON roles                  TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON users                  TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON regions                TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON cities                 TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON warehouses             TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON warehouse_locations    TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON user_roles             TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON item_categories        TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON units                  TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON items                  TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON item_unit_conversions  TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON suppliers              TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON customers              TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_receipts         TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_receipt_lines    TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON batches                TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_issues           TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_issue_lines      TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_transfers        TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_transfer_lines   TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_adjustments      TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_adjustment_lines TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON opname_sessions        TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON opname_lines           TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_ledger           TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON stock_balances         TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only" ON audit_logs             TO postgres USING (true) WITH CHECK (true);

-- ============================================================
-- BAGIAN 3: SEMBUNYIKAN KOLOM SENSITIF DARI SUPABASE REST API
--
-- Kolom password_hash di tabel users harus tidak bisa
-- diakses melalui Supabase REST API langsung
-- ============================================================

-- Cabut semua hak akses tabel users dari role anon dan authenticated
-- (role yang digunakan Supabase REST API publik)
REVOKE ALL ON users FROM anon;
REVOKE ALL ON users FROM authenticated;

-- Izinkan akses terbatas (tanpa password_hash) jika diperlukan di masa depan
-- saat ini: TIDAK ADA akses langsung ke tabel users dari luar

-- Juga cabut akses ke tabel-tabel kritis lainnya dari publik
REVOKE ALL ON audit_logs        FROM anon, authenticated;
REVOKE ALL ON stock_ledger      FROM anon, authenticated;
REVOKE ALL ON user_roles        FROM anon, authenticated;

-- ============================================================
-- BAGIAN 4: VERIFIKASI — Cek status RLS semua tabel
-- ============================================================

SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Semua tabel harus menampilkan rls_enabled = true
