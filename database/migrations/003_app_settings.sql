-- Tabel untuk menyimpan konfigurasi aplikasi (termasuk export path)
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backend_only" ON app_settings TO postgres USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
(
    'export_base_path',
    'C:\Users\Administrator\Documents\GudangKu\Exports',
    'Folder default tempat semua file export Excel disimpan. Bisa diubah di menu Settings.'
),
(
    'export_organize_by_type',
    'true',
    'Jika true, file dikelompokkan ke subfolder berdasarkan jenis laporan (posisi-stok, expiry, dll)'
),
(
    'company_name',
    'GudangKu',
    'Nama perusahaan yang tampil di header laporan Excel'
)
ON CONFLICT (key) DO NOTHING;
