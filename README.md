# GudangKu — Sistem Manajemen Stok Gudang Nasional

GudangKu adalah perangkat lunak (software) manajemen stok dan operasional gudang berbasis Desktop (Electron) yang dirancang khusus untuk distribusi bahan pokok (sembako/FMCG) skala nasional di seluruh Indonesia. Aplikasi ini mengintegrasikan kemudahan antarmuka web modern dengan keandalan aplikasi desktop, memungkinkan pemantauan inventaris, manajemen master data, dan kontrol hak akses secara komprehensif.

## Fitur Utama

- **Aplikasi Desktop Terintegrasi:** Berjalan mandiri tanpa memerlukan browser terpisah, membungkus Frontend (Next.js) dan Backend (Node.js) dalam satu kesatuan.
- **Pembaruan Otomatis (Auto-Update):** Perangkat klien akan secara otomatis mendeteksi, mengunduh, dan memperbarui aplikasi ke versi terbaru di latar belakang tanpa perlu melakukan *uninstall* secara manual.
- **Manajemen Inventaris & Master Data:** Pencatatan stok barang, pergerakan barang, manajemen pemasok (supplier), dan data master lainnya dengan akurat.
- **Role-Based Access Control (RBAC):** Sistem perizinan dinamis berdasarkan peran pengguna (Admin, Warehouse Manager, Staff Gudang, dll) yang membatasi akses secara ketat baik pada antarmuka pengguna maupun tingkat API.
- **Multilingual Support (i18n):** Mendukung pergantian bahasa (Bahasa Indonesia dan English) secara instan untuk kemudahan operasional.
- **Monitoring & Reconnect:** Sistem dilengkapi dengan *auto-reconnect*, layar pemuatan (splash screen) interaktif, dan *health monitoring* untuk memastikan kestabilan koneksi aplikasi dengan database utama.

## Struktur Proyek

```
gudangku/
├── backend/          ← API Server (Node.js + Express)
├── frontend/         ← UI Web (Next.js)
├── electron/         ← Desktop Wrapper & Konfigurasi Auto-Updater
├── database/         ← Script SQL, Migrations & Seeds
└── dist-electron/    ← Hasil build installer (Aplikasi siap pakai)
```

---

## 🛠️ Cara Penggunaan (Untuk Pengguna Akhir)

Aplikasi GudangKu dirancang agar sangat mudah digunakan oleh staf gudang layaknya aplikasi desktop standar:

1. **Instalasi:** 
   - Unduh file *installer* (contoh: `GudangKu-Setup-1.0.0.exe`) dari [halaman Rilis GitHub](https://github.com/nxvrnlsr/gudangku/releases).
   - Buka file tersebut dan aplikasi akan terpasang secara otomatis.
2. **Menjalankan Aplikasi Pertama Kali:**
   - Buka *shortcut* **GudangKu** yang ada di Desktop Anda.
   - Pada saat **pertama kali dijalankan di perangkat baru**, aplikasi membutuhkan waktu sekitar 1-2 menit untuk menyiapkan server lokal. Anda akan melihat layar pemuatan animasi. Mohon ditunggu hingga halaman masuk (login) muncul.
3. **Menerima Pembaruan (Auto-Update):**
   - Anda tidak perlu mengunduh *installer* baru setiap kali ada perbaikan atau fitur baru.
   - GudangKu mengecek pembaruan secara otomatis. Jika pembaruan tersedia dan telah selesai diunduh di latar belakang, sebuah notifikasi akan muncul di pojok kanan bawah layar aplikasi Anda.
   - Cukup klik tombol **"Restart Sekarang"** pada notifikasi tersebut, dan aplikasi akan memperbarui dirinya sendiri dengan cepat.

---

## 💻 Cara Menjalankan (Untuk Developer)

Jika Anda ingin mengembangkan atau memodifikasi sistem ini, berikut adalah panduan teknisnya:

### 1. Menjalankan Mode Development
Terdapat beberapa komponen yang harus dijalankan. Buka dua terminal terpisah:

**Terminal 1 (Backend):**
```bash
cd backend
npm install
npm run dev
# Server API akan berjalan di http://localhost:3001
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
# Tampilan UI akan berjalan di http://localhost:3000
```

### 2. Membangun Aplikasi Desktop (Build Installer)
Untuk mengompilasi sistem menjadi aplikasi `.exe` mandiri yang siap distribusikan:

1. Pastikan Anda berada di direktori utama (root) `gudangku/`
2. Instal dependensi utama:
   ```bash
   npm install
   ```
3. Mulai proses *build* (ini akan menggabungkan frontend, backend, dan membungkusnya dalam Electron):
   ```bash
   npm run electron:build
   ```
4. Setelah selesai, file *installer* dapat ditemukan di dalam folder `dist-electron/`.

### 3. Mempublikasikan Pembaruan (Release / Publish)
Untuk mendistribusikan pembaruan ke semua perangkat pengguna secara otomatis:

1. Pastikan nomor versi (`version`) di `package.json` sudah dinaikkan (contoh dari `1.0.0` menjadi `1.0.1`).
2. Anda harus memiliki *Personal Access Token* dari GitHub.
3. Jalankan perintah berikut di PowerShell (dari root folder proyek):
   ```powershell
   $env:GH_TOKEN = "TOKEN_GITHUB_ANDA"
   npm run electron:publish
   ```
4. Sistem akan melakukan *build* ulang dan langsung mengunggahnya ke GitHub Releases. Perangkat klien akan otomatis mendeteksi pembaruan ini.
