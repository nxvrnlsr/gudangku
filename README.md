<div align="center">

# 🏭 GudangKu

**Sistem Manajemen Stok Gudang untuk Distribusi Nasional**

Aplikasi desktop lintas perangkat berbasis Electron yang mengelola inventory, pergerakan stok, batch/expiry, dan kontrol akses pengguna — tanpa butuh koneksi internet.

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1?style=for-the-badge&logo=github)](https://github.com/nxvrnlsr/gudangku/releases)
[![License](https://img.shields.io/badge/license-ISC-22c55e?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-0078d7?style=for-the-badge&logo=windows)](https://github.com/nxvrnlsr/gudangku/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)

</div>

---

## 📸 Tampilan Aplikasi

![GudangKu Dashboard](docs/screenshot-dashboard.png)

> _Dashboard real-time dengan ringkasan KPI, status batch, dan riwayat transaksi terkini._

---

## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 📦 **Manajemen Inventaris** | Kelola master barang, SKU, kategori, satuan, dan harga HPP |
| 🏬 **Multi-Gudang** | Transfer stok antar gudang dengan pelacakan real-time |
| 📥 **Penerimaan Barang** | Dokumen penerimaan (SR) yang memperbarui stok otomatis |
| 📤 **Pengeluaran FEFO** | Pengeluaran stok otomatis berdasarkan First Expired First Out |
| ⏰ **Monitor Batch & Expiry** | Notifikasi visual untuk batch kritis, peringatan, dan kadaluarsa |
| 👥 **Role-Based Access** | 5 level akses: Admin, Regional Manager, Kepala Gudang, Staff, Viewer |
| 📊 **Laporan Excel** | Export posisi stok, kartu stok, dan laporan expiry ke `.xlsx` |
| 🌐 **Multibahasa** | Antarmuka dalam Bahasa Indonesia & English (i18n) |
| 🔄 **Auto-Update** | Update otomatis di background, tanpa reinstall manual |
| 🖥️ **Desktop App** | Berjalan sebagai aplikasi Electron — tidak butuh browser terpisah |

---

## 🛠️ Tech Stack

### Frontend
- [![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=next.js)](https://nextjs.org) — React framework (App Router + SSR)
- [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org) — Type-safe development
- [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com) — Utility-first styling
- [![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-18181B?style=flat-square&logo=shadcnui)](https://ui.shadcn.com) — Headless UI components

### Backend
- [![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org) — Runtime
- [![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express)](https://expressjs.com) — REST API framework
- [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org) — Relational database
- [![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens)](https://jwt.io) — Stateless authentication

### Desktop & DevOps
- [![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org) — Cross-platform desktop wrapper
- [![electron-builder](https://img.shields.io/badge/electron--builder-34495e?style=flat-square)](https://electron.build) — `.exe` installer packaging
- [![PM2](https://img.shields.io/badge/PM2-2B037A?style=flat-square&logo=pm2)](https://pm2.keymetrics.io) — Process management (production)

---

## 📁 Struktur Folder

```
gudangku/
├── electron/               # Electron main process & preload
│   ├── main.js             #   Entry point Electron, auto-updater
│   └── preload.js          #   IPC bridge ke renderer (frontend)
│
├── frontend/               # Next.js App (TypeScript + Tailwind)
│   └── src/
│       ├── app/            #   Route pages (App Router)
│       ├── components/     #   Reusable UI components & modules
│       └── lib/            #   API client, permissions, utils
│
├── backend/                # Express REST API
│   └── src/
│       ├── config/         #   Koneksi database PostgreSQL
│       ├── middleware/     #   Auth (JWT), i18n, permission guard
│       ├── modules/        #   Fitur modular (masing-masing punya controller + routes)
│       │   ├── auth/
│       │   ├── items/
│       │   ├── warehouses/
│       │   ├── receipts/
│       │   ├── issues/
│       │   ├── transfers/
│       │   ├── batches/
│       │   ├── reports/
│       │   └── users/
│       └── utils/          #   Helper: stock movement, doc numbering, Excel export
│
├── database/               # SQL migration scripts
├── docs/                   # Dokumentasi & screenshot
├── scripts/                # Build post-processing scripts
├── .env.example            # Template variabel lingkungan (JANGAN commit .env asli!)
├── .gitignore
├── ecosystem.config.js     # Konfigurasi PM2 untuk production
└── package.json            # Root scripts (build, electron, pm2)
```

---

## 🚀 Cara Menjalankan (Development)

### Prasyarat
- [Node.js](https://nodejs.org) ≥ 18
- [PostgreSQL](https://www.postgresql.org/download/) ≥ 14 (atau akun [Supabase](https://supabase.com))

### 1. Clone & Install

```bash
git clone https://github.com/nxvrnlsr/gudangku.git
cd gudangku
```

### 2. Setup Environment

```bash
# Salin template env backend
cp backend/.env.example backend/.env

# Edit backend/.env dan isi nilai berikut:
# DATABASE_URL=postgresql://user:password@host:5432/gudangku
# JWT_SECRET=your-super-secret-key-minimal-32-chars
# PORT=3001
```

### 3. Jalankan Backend

```bash
cd backend
npm install
npm run dev
# API berjalan di → http://localhost:3001
```

### 4. Jalankan Frontend

```bash
# Terminal baru
cd frontend
npm install
npm run dev
# UI berjalan di → http://localhost:3000
```

### 5. (Opsional) Jalankan sebagai Desktop App

```bash
# Dari root folder
npm install
npm run electron:dev
```

---

## 📦 Build Installer (.exe)

```bash
# Dari root folder
npm run electron:build

# Output: dist-electron/GudangKu Setup x.x.x.exe
```

Untuk publish ke GitHub Releases:
```bash
npm run electron:publish
```

---

## 🔑 Peran & Akses (RBAC)

| Role | Dashboard | Barang | Penerimaan | Pengeluaran | Transfer | Laporan | Users |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `regional_manager` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `kepala_gudang` | ✅ | 👁️ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `staff_gudang` | ✅ | 👁️ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `viewer` | ✅ | 👁️ | 👁️ | 👁️ | 👁️ | ✅ | ❌ |

> ✅ Full access &nbsp;|&nbsp; 👁️ Read-only &nbsp;|&nbsp; ❌ No access

---

## 📝 Panduan Kontribusi

Proyek ini menggunakan **Conventional Commits**. Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan lengkap.

```bash
# Format: <type>: <deskripsi singkat>
feat: tambah filter expiry pada halaman batch
fix: perbaiki kalkulasi stok saat qty desimal
docs: update README dengan panduan instalasi
```

---

## 📄 Lisensi

Copyright © 2025–2026 GudangKu. Distributed under the [ISC License](LICENSE).

---

<div align="center">
  Dibuat dengan ☕ dan semangat ngurangin stok mati di gudang.
</div>
