# 📝 Panduan Kontribusi — GudangKu

Terima kasih sudah berkontribusi! Ikuti panduan berikut agar riwayat Git kita tetap bersih, profesional, dan mudah dibaca semua orang.

---

## ✅ Conventional Commits

Format standar yang wajib dipakai untuk setiap commit:

```
<type>(<scope>): <deskripsi singkat>

[opsional: body — penjelasan lebih panjang]

[opsional: footer — misal: BREAKING CHANGE atau Closes #123]
```

---

### 🏷️ Tipe Commit yang Valid

| Tipe | Kapan dipakai | Contoh |
|---|---|---|
| `feat` | Menambah fitur baru | `feat: tambah filter expiry pada halaman batch` |
| `fix` | Memperbaiki bug | `fix: perbaiki qty NaN saat item tanpa satuan` |
| `docs` | Perubahan dokumentasi saja | `docs: update README dengan panduan instalasi` |
| `style` | Format, spasi, titik-koma — tidak ada perubahan logika | `style: rapikan indentasi batches.controller.js` |
| `refactor` | Restruktur kode tanpa mengubah fungsionalitas | `refactor: pisah stock utils ke file tersendiri` |
| `perf` | Peningkatan performa | `perf: tambah index pada kolom expiry_date` |
| `test` | Menambah atau memperbaiki test | `test: tambah unit test untuk FEFO logic` |
| `chore` | Pemeliharaan, update dependency, konfigurasi build | `chore: update electron ke v36` |
| `ci` | Perubahan CI/CD pipeline | `ci: tambah workflow build otomatis` |
| `revert` | Membatalkan commit sebelumnya | `revert: feat: tambah filter expiry pada halaman batch` |

---

### 📦 Scope (Opsional tapi Sangat Direkomendasikan)

Scope menunjukkan modul atau area yang terpengaruh:

```bash
feat(items): tambah field kode barcode pada form master barang
fix(issues): perbaiki error stok tidak cukup saat qty desimal
docs(readme): tambah screenshot dashboard
chore(deps): upgrade next.js ke 15.2
```

Scope yang umum dipakai:
- `auth`, `items`, `warehouses`, `receipts`, `issues`, `transfers`, `batches`
- `reports`, `users`, `electron`, `frontend`, `backend`, `db`, `deps`, `readme`

---

### 💡 Tips Menulis Pesan Commit yang Baik

**✅ BAGUS:**
```
feat(issues): tambah validasi stok minimum sebelum konfirmasi pengeluaran

Sebelumnya server akan error 500 jika stok tidak cukup.
Sekarang mengembalikan 400 dengan pesan yang jelas ke frontend.

Closes #42
```

**❌ JANGAN:**
```
fix bug
update
benerin yang kemarin error
asdfgh
wkwk coba lagi
```

---

### ⚠️ Breaking Changes

Jika perubahan kamu akan merusak kompatibilitas (misal: mengubah struktur API atau skema DB), tandai dengan `!` atau tambahkan `BREAKING CHANGE` di footer:

```
feat(auth)!: ubah format token JWT dari payload lama

BREAKING CHANGE: semua client yang menyimpan token lama harus login ulang.
```

---

## 🌿 Panduan Branch

| Branch | Fungsi |
|---|---|
| `main` | Kode production yang stabil. **Tidak boleh commit langsung.** |
| `develop` | Branch integrasi utama. Semua feature branch di-merge ke sini. |
| `feat/<nama>` | Untuk fitur baru. Contoh: `feat/filter-expiry` |
| `fix/<nama>` | Untuk perbaikan bug. Contoh: `fix/qty-desimal-error` |
| `hotfix/<nama>` | Perbaikan mendesak langsung ke `main`. |

---

## 🔒 Aturan Keamanan

> **WAJIB DIPATUHI — pelanggaran akan minta rollback:**

- **JANGAN pernah commit file `.env`** — credentials database dan JWT secret tidak boleh ada di Git.
- Gunakan **`.env.example`** untuk mendokumentasikan variabel yang diperlukan (tanpa nilai asli).
- File `node_modules/` sudah ada di `.gitignore` — **jangan pernah dihapus dari sana**.
- Jika tidak sengaja commit credentials, segera rotasi (ganti) key/password tersebut.
