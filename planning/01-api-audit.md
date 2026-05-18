# API Audit — GudangKu Backend
> Dibuat: 2026-05-18 | Author: nxvrnlsr

---

## 🔴 CRITICAL

### [C-01] Race Condition pada `generateDocNumber`
**File:** `utils/stock.utils.js:24-31`

Menggunakan `COUNT(*)` untuk generate sequence. Jika 2 request masuk bersamaan, keduanya bisa dapat COUNT yang sama → **duplicate doc_number** → crash unique constraint.

**Fix:** Gunakan PostgreSQL native `SEQUENCE` atau `SELECT MAX(...) FOR UPDATE`.

---

### [C-02] `transfers.dispatch()` return 500 untuk business error
**File:** `modules/transfers/transfers.controller.js:148-205`

`throw new Error("Stok tidak cukup")` tertangkap catch yang selalu return 500. Mobile menyangka server crash, padahal ini kesalahan user.

**Fix:** Tambah `err.statusCode = 400` (sama seperti perbaikan issues/receipts).

---

### [C-03] Tidak ada Rate Limiting pada Login
**File:** `modules/auth/auth.routes.js`

`POST /api/auth/login` tidak ada proteksi brute-force. Setelah mobile dirilis, attack surface makin besar.

**Fix:** Pasang `express-rate-limit` — maks 10 request/menit per IP.

---

### [C-04] Tidak ada Refresh Token
**File:** `modules/auth/auth.controller.js:42-46`

Token 7 hari, tidak ada mekanisme silent refresh. Mobile app akan tiba-tiba logout di tengah pekerjaan.

**Fix:** Access token 15 menit + refresh token 30 hari. Endpoint baru:
- `POST /api/auth/refresh`
- `POST /api/auth/logout` (revoke)

---

## 🟠 HIGH

### [H-01] Middleware Auth Hit DB Setiap Request
**File:** `middleware/auth.js:14-29`

2 query DB per request (SELECT user + SELECT roles). Mobile app yang polling = beban DB berlipat.

**Fix:** Embed roles di JWT payload. Cache hasil verify dengan TTL pendek.

---

### [H-02] Tidak ada API Versioning
**File:** `index.js`

Semua route `/api/items` tanpa versi. Kalau API berubah setelah mobile dirilis ke store, semua versi lama **broken**.

**Fix:** Prefix semua route → `/api/v1/`. Buat versioned router.

---

### [H-03] `items.update()` COALESCE Trap
**File:** `modules/items/items.controller.js:139-150`

`COALESCE($n, field)` artinya kirim `null` tidak akan clear field. Mobile tidak bisa hapus barcode atau reset `max_stock_qty`.

**Fix:** Partial update — hanya update field yang eksplisit ada di request body.

---

### [H-04] Tidak ada Endpoint Barcode Scan
Tidak ada `GET /api/items/barcode/:barcode`. Fitur scan barcode di mobile tidak bisa diimplementasi.

**Fix:** Tambah endpoint barcode lookup + stock summary semua gudang.

---

### [H-05] Tidak ada Push Notification Infrastructure
Tidak ada sistem alert ke device mobile untuk stok minimum / batch expiry.

**Fix:** Integrasi FCM. Tambah tabel `device_tokens`. Buat job scheduler untuk cek threshold.

---

### [H-06] `transfers.receive()` crash jika `batch_id = null`
**File:** `modules/transfers/transfers.controller.js:255-261`

Jika `line.batch_id` null, query ke `batches` return undefined → `batch.batch_number` crash.

**Fix:** Guard `if (!line.batch_id) throw validationError(...)` sebelum query.

---

## 🟡 MEDIUM

### [M-01] Tidak ada Centralized Input Validation
Validasi tersebar dan tidak konsisten. Tidak ada Zod/Joi schema per route.

### [M-02] `postStockMovement` tidak guard zero-qty
Bisa dipanggil dengan qty_in=0, qty_out=0 → insert ledger entry kosong yang tidak bermakna.

### [M-03] `deleteItem` pakai raw `req.lang` bukan `req.t()`
Inkonsisten dengan modul lain yang sudah pakai i18n helper.

### [M-04] `transfers.getAll()` tidak ada pagination total count
Inconsistent dengan `receipts` dan `items` yang sudah punya `pagination` object.

### [M-05] Tidak ada Audit Trail / Activity Log
Tidak ada pencatatan siapa melakukan apa dan kapan untuk operasi kritis.

### [M-06] CORS hanya allow satu origin
Mobile native app butuh handling CORS yang berbeda dari web.

---

## Ringkasan

| Level | Jumlah |
|---|---|
| 🔴 Critical | 4 |
| 🟠 High | 6 |
| 🟡 Medium | 6 |
| **Total** | **16 issues** |

Minimal semua Critical + High harus beres sebelum integrasi mobile.
