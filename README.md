# GudangKu — Sistem Manajemen Stok Gudang Nasional

Software manajemen dan perhitungan stok gudang untuk distribusi bahan pokok (sembako/FMCG) skala nasional di seluruh Indonesia.

## Struktur Proyek

```
gudangku/
├── backend/          ← API Server (Node.js + Express)
├── frontend/         ← UI Web (Next.js)
├── database/         ← Script SQL & Migrations
│   ├── migrations/   ← Pembuatan tabel
│   └── seeds/        ← Data awal (roles, kategori, dll)
└── docs/             ← Dokumentasi tambahan
```

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js (React) + TypeScript |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | JWT |

## Cara Menjalankan (Development)

### Backend
```bash
cd backend
npm install
npm run dev
# Berjalan di http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Berjalan di http://localhost:3000
```

## Status Proyek
- [x] Scope of Work
- [x] Desain ERD
- [x] Mockup UI
- [x] Setup Infrastruktur
- [ ] Development Backend
- [ ] Development Frontend
- [ ] Testing & UAT
- [ ] Go-Live
