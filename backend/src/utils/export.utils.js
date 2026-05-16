const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

/**
 * Ambil konfigurasi export path dari database
 * Jika tidak ada, gunakan default
 */
const getExportConfig = async () => {
  try {
    const result = await db.query(
      `SELECT key, value FROM app_settings WHERE key IN ('export_base_path', 'export_organize_by_type', 'company_name')`
    );

    const config = {};
    for (const row of result.rows) {
      config[row.key] = row.value;
    }

    return {
      basePath: config['export_base_path'] || path.join(require('os').homedir(), 'Documents', 'GudangKu', 'Exports'),
      organizeByType: config['export_organize_by_type'] !== 'false', // default true
      companyName: config['company_name'] || 'GudangKu',
    };
  } catch {
    return {
      basePath: path.join(require('os').homedir(), 'Documents', 'GudangKu', 'Exports'),
      organizeByType: true,
      companyName: 'GudangKu',
    };
  }
};

/**
 * Subtype folder mapping untuk organisasi file
 * Setiap jenis laporan punya subfolder sendiri
 */
const EXPORT_FOLDERS = {
  'posisi-stok':  'Laporan Posisi Stok',
  'expiry':       'Laporan Kadaluarsa',
  'kartu-stok':   'Kartu Stok',
  'penerimaan':   'Penerimaan Barang',
  'pengeluaran':  'Pengeluaran Barang',
  'transfer':     'Transfer Barang',
  'lainnya':      'Lainnya',
};

/**
 * Simpan data ke file Excel di folder yang terorganisir
 *
 * @param {Array}  data         - Array of objects (baris data)
 * @param {string} sheetName    - Nama sheet di Excel
 * @param {string} fileType     - Jenis laporan (key dari EXPORT_FOLDERS)
 * @param {string} baseFilename - Nama file tanpa ekstensi dan tanggal
 * @param {string} customPath   - (opsional) path kustom dari user
 *
 * @returns {Object} { filePath, fileName, folderPath }
 */
const saveExcelFile = async (data, sheetName, fileType, baseFilename, customPath = null) => {
  const config = await getExportConfig();

  // ── 1. Tentukan folder tujuan ──────────────────────────
  let targetFolder;
  if (customPath) {
    // User menentukan path sendiri
    targetFolder = customPath;
  } else if (config.organizeByType) {
    // Organisasi otomatis berdasarkan jenis laporan
    const subFolder = EXPORT_FOLDERS[fileType] || EXPORT_FOLDERS['lainnya'];
    targetFolder = path.join(config.basePath, subFolder);
  } else {
    // Simpan semua di satu folder saja
    targetFolder = config.basePath;
  }

  // ── 2. Buat folder jika belum ada ─────────────────────
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  // ── 3. Buat nama file dengan timestamp ────────────────
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .split('.')[0];  // Format: 2026-05-16_23-15-00

  const fileName = `${baseFilename}_${timestamp}.xlsx`;
  const filePath = path.join(targetFolder, fileName);

  // ── 4. Buat workbook Excel dengan styling ─────────────
  const wb = XLSX.utils.book_new();

  // Tambah baris header info perusahaan di atas data
  const headerInfo = [
    [`${config.companyName} — ${sheetName}`],
    [`Dicetak: ${now.toLocaleString('id-ID')}`],
    [],  // baris kosong
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerInfo);

  // Append data setelah header info
  XLSX.utils.sheet_add_json(ws, data, { origin: 'A4' });

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // ── 5. Tulis file ke disk ──────────────────────────────
  XLSX.writeFile(wb, filePath);

  return {
    filePath,       // path lengkap: C:\Users\...\file.xlsx
    fileName,       // nama file: posisi-stok_2026-05-16_23-15-00.xlsx
    folderPath: targetFolder, // folder tempat tersimpan
  };
};

/**
 * Update export path di database (dipanggil dari Settings API)
 */
const updateExportPath = async (newPath, userId) => {
  // Validasi path: harus bisa dibuat
  try {
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true });
    }
  } catch (err) {
    throw new Error(`Path tidak valid atau tidak bisa dibuat: ${err.message}`);
  }

  await db.query(
    `UPDATE app_settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = 'export_base_path'`,
    [newPath, userId]
  );

  return newPath;
};

/**
 * Buka folder di Windows Explorer (dipanggil dari frontend via API)
 */
const openFolder = (folderPath) => {
  const { exec } = require('child_process');
  if (fs.existsSync(folderPath)) {
    exec(`explorer "${folderPath}"`);
    return true;
  }
  return false;
};

module.exports = { saveExcelFile, getExportConfig, updateExportPath, openFolder, EXPORT_FOLDERS };
