/**
 * Backend Locale — Bahasa Indonesia
 */
module.exports = {
  // ── Common ──────────────────────────────────────
  serverError:   'Terjadi kesalahan server.',
  notFound:      'Dokumen tidak ditemukan.',
  forbidden:     'Akses ditolak.',
  unauthorized:  'Akses ditolak. Token tidak ditemukan.',
  tokenInvalid:  'Token tidak valid atau user tidak aktif.',
  tokenExpired:  'Token sudah kadaluarsa. Silakan login ulang.',
  routeNotFound: 'Route tidak ditemukan.',

  // ── Auth ────────────────────────────────────────
  auth: {
    emailPasswordRequired: 'Email dan password wajib diisi.',
    invalidCredentials:    'Email atau password salah.',
    accountInactive:       'Akun Anda tidak aktif. Hubungi administrator.',
    passwordRequired:      'Password lama dan baru wajib diisi.',
    passwordMinLength:     'Password baru minimal 8 karakter.',
    currentPasswordWrong:  'Password lama salah.',
    passwordChanged:       'Password berhasil diubah.',
    loginSuccess:          'Login berhasil.',
  },

  // ── Users ───────────────────────────────────────
  users: {
    loadError:    'Gagal memuat data pengguna.',
    rolesError:   'Gagal memuat roles.',
    nameEmailPasswordRequired: 'Nama, email, dan password wajib diisi.',
    passwordMinLength: 'Password minimal 8 karakter.',
    emailTaken:   'Email sudah digunakan.',
    created:      'Pengguna berhasil dibuat.',
    createError:  'Gagal membuat pengguna.',
    updated:      'Pengguna berhasil diperbarui.',
    updateError:  'Gagal memperbarui pengguna.',
    passwordMinLengthReset: 'Password minimal 8 karakter.',
    passwordReset: 'Password berhasil direset.',
    resetError:   'Gagal reset password.',
  },

  // ── Warehouses ──────────────────────────────────
  warehouses: {
    notFound:     'Gudang tidak ditemukan.',
    serverError:  'Gagal memuat data gudang.',
  },

  // ── Items ───────────────────────────────────────
  items: {
    notFound:     'Barang tidak ditemukan.',
    skuTaken:     'SKU sudah digunakan oleh barang lain.',
    created:      'Barang berhasil dibuat.',
    createError:  'Gagal membuat barang.',
    updated:      'Barang berhasil diperbarui.',
    updateError:  'Gagal memperbarui barang.',
    deleted:      'Barang berhasil dihapus.',
    deleteError:  'Gagal menghapus barang.',
    serverError:  'Gagal memuat data barang.',
  },

  // ── Receipts ────────────────────────────────────
  receipts: {
    notFound:         'Dokumen penerimaan tidak ditemukan.',
    warehouseRequired:'Gudang, supplier, dan minimal 1 baris barang wajib diisi.',
    alreadyConfirmed: 'Dokumen ini sudah dikonfirmasi sebelumnya.',
    alreadyCancelled: 'Dokumen ini sudah dibatalkan sebelumnya.',
    created:          'Penerimaan berhasil dibuat.',
    createError:      'Gagal membuat penerimaan.',
    confirmed:        'Penerimaan dikonfirmasi. Stok telah diperbarui.',
    confirmError:     'Gagal mengkonfirmasi penerimaan.',
    cancelled:        'Penerimaan dibatalkan.',
    cancelError:      'Gagal membatalkan penerimaan.',
    serverError:      'Gagal memuat data penerimaan.',
  },

  // ── Issues ──────────────────────────────────────
  issues: {
    notFound:           'Dokumen pengeluaran tidak ditemukan.',
    warehouseRequired:  'Gudang dan minimal 1 baris barang wajib diisi.',
    alreadyConfirmed:   'Dokumen ini sudah dikonfirmasi sebelumnya.',
    alreadyCancelled:   'Dokumen ini sudah dibatalkan sebelumnya.',
    insufficientStock:  'Stok tidak mencukupi untuk satu atau lebih barang.',
    created:            'Dokumen pengeluaran berhasil dibuat.',
    createError:        'Gagal membuat dokumen pengeluaran.',
    confirmed:          'Pengeluaran dikonfirmasi. Stok telah berkurang.',
    confirmError:       'Gagal mengkonfirmasi pengeluaran.',
    cancelled:          'Pengeluaran dibatalkan.',
    cancelError:        'Gagal membatalkan pengeluaran.',
    serverError:        'Gagal memuat data pengeluaran.',
  },

  // ── Transfers ───────────────────────────────────
  transfers: {
    notFound:          'Dokumen transfer tidak ditemukan.',
    warehouseRequired: 'Gudang asal, tujuan, dan minimal 1 baris wajib diisi.',
    sameWarehouse:     'Gudang asal dan tujuan tidak boleh sama.',
    invalidStatusDispatch: (status) => `Status '${status}' tidak bisa dikirim.`,
    invalidStatusReceive:  (status) => `Status harus 'in_transit' untuk diterima. Status saat ini: '${status}'.`,
    created:           (docNum) => `Transfer ${docNum} berhasil dibuat.`,
    createError:       'Gagal membuat transfer.',
    dispatched:        (docNum) => `Transfer ${docNum} dikirim. Stok gudang asal berkurang.`,
    dispatchError:     'Gagal mengirim transfer.',
    received:          (docNum) => `Transfer ${docNum} diterima. Stok gudang tujuan bertambah.`,
    receiveError:      'Gagal menerima transfer.',
    serverError:       'Gagal memuat data transfer.',
  },

  // ── Reports ─────────────────────────────────────
  reports: {
    itemWarehouseRequired: 'item_id dan warehouse_id wajib diisi.',
    exportPathRequired:    'export_path wajib diisi.',
    fileSaved:             'File berhasil disimpan.',
    pathUpdated:           (path) => `Path export diubah ke: ${path}`,
    folderNotFound:        (path) => `Folder tidak ditemukan: ${path}`,
    folderOpened:          'Folder dibuka di Windows Explorer.',
    serverError:           'Terjadi kesalahan server.',
  },

  // ── Batches ─────────────────────────────────────
  batches: {
    notFound:    'Batch tidak ditemukan.',
    updated:     'Status batch berhasil diperbarui.',
    updateError: 'Gagal memperbarui batch.',
    serverError: 'Gagal memuat data batch.',
  },
};
