# Mobile App Integration Plan — GudangKu
> Dibuat: 2026-05-18 | Author: nxvrnlsr

---

## 1. Visi & Tujuan

Mobile app GudangKu adalah **companion app** untuk staf gudang — bukan pengganti desktop. Fokusnya pada operasi lapangan:

- ✅ Scan barcode untuk cek stok real-time
- ✅ Konfirmasi penerimaan barang dari HP (saat barang datang di loading dock)
- ✅ Buat pengeluaran sederhana langsung dari HP
- ✅ Alert push notification: stok habis, batch mau expired
- ✅ Lihat status transfer masuk ke gudang saya
- ❌ BUKAN untuk: laporan Excel, manajemen user, konfigurasi sistem

**Platform:** React Native (Expo) — satu codebase untuk Android & iOS.

---

## 2. User Roles di Mobile

| Role | Akses Mobile |
|---|---|
| `admin` | Semua fitur (jarang pakai mobile) |
| `kepala_gudang` | Semua operasi + approval |
| `staff_gudang` | Penerimaan, pengeluaran, scan stok |
| `viewer` | Cek stok & laporan saja (read-only) |
| `regional_manager` | Read-only semua gudang |

---

## 3. Arsitektur Integrasi

```
┌─────────────────────────────────────────────────────┐
│                   Mobile App (Expo)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Auth Screen │  │  Dashboard   │  │  Scanner  │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
└─────────┼────────────────┼────────────────┼─────────┘
          │   HTTPS + JWT   │                │
          ▼                 ▼                ▼
┌─────────────────────────────────────────────────────┐
│              GudangKu Backend API (v1)               │
│  /api/v1/auth   /api/v1/items   /api/v1/receipts    │
│  + FCM Push Notification via Firebase Admin SDK      │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   PostgreSQL DB  │
              └─────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Firebase FCM   │
              │ (Push Notif)    │
              └─────────────────┘
```

---

## 4. Endpoint Baru yang Diperlukan untuk Mobile

### 4.1 Auth

```
POST /api/v1/auth/login          → sama, + return refresh_token
POST /api/v1/auth/refresh        → [BARU] silent token refresh
POST /api/v1/auth/logout         → [BARU] revoke refresh token
POST /api/v1/auth/register-device → [BARU] simpan FCM device token
```

**Schema `register-device`:**
```json
{ "fcm_token": "string", "platform": "android|ios", "device_name": "string" }
```

---

### 4.2 Scan & Quick Stock Check

```
GET /api/v1/items/barcode/:barcode    → [BARU] lookup by barcode
GET /api/v1/items/sku/:sku            → [BARU] lookup by SKU
```

**Response barcode lookup:**
```json
{
  "id": "uuid",
  "name": "Minyak Goreng 1L",
  "sku": "MG-001",
  "barcode": "8991234567890",
  "stock_summary": [
    { "warehouse": "Gudang A", "qty_on_hand": 120, "qty_available": 100 },
    { "warehouse": "Gudang B", "qty_on_hand": 45, "qty_available": 45 }
  ],
  "nearest_expiry": "2026-08-15",
  "status": "normal"  // normal | minimum | stockout | overstock
}
```

---

### 4.3 Dashboard Mobile

```
GET /api/v1/dashboard/mobile?warehouse_id=xxx
```

**Response (ringkas untuk mobile, tidak semua data):**
```json
{
  "my_warehouse": { "name": "Gudang A", "total_items": 48 },
  "alerts": {
    "low_stock": 3,
    "expiring_7d": 2,
    "pending_transfers": 1
  },
  "recent_transactions": [ ...last 5 ] 
}
```

---

### 4.4 Quick Receive (Penerimaan Cepat dari Mobile)

```
POST /api/v1/receipts/quick-receive    → [BARU]
```

Versi simplified dari receipt biasa — cocok untuk input dari HP:
```json
{
  "warehouse_id": "uuid",
  "supplier_name": "PT Sumber Jaya",
  "items": [
    {
      "barcode": "8991234567890",
      "qty": 50,
      "batch_number": "BT-2026-001",
      "expiry_date": "2026-12-31"
    }
  ]
}
```
Endpoint ini langsung confirm (tidak perlu 2 step draft → confirm).

---

### 4.5 Notifikasi & Device

```
GET  /api/v1/notifications             → list notifikasi user ini
PUT  /api/v1/notifications/:id/read    → mark as read
PUT  /api/v1/notifications/read-all    → mark semua as read
```

---

## 5. Database Changes yang Diperlukan

### Tabel Baru

```sql
-- Refresh Token Storage
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

-- FCM Device Tokens
CREATE TABLE device_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token    TEXT NOT NULL,
  platform     VARCHAR(10) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_name  TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fcm_token)
);

-- In-App Notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),  -- NULL = broadcast ke semua
  type        VARCHAR(50) NOT NULL,       -- 'low_stock', 'expiry', 'transfer_in'
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,                      -- extra payload (item_id, warehouse_id, dll)
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  action        VARCHAR(50) NOT NULL,   -- 'create', 'update', 'delete', 'confirm'
  entity_type   VARCHAR(50) NOT NULL,   -- 'receipt', 'issue', 'item', dll
  entity_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Doc Number Sequence (replace COUNT-based generation)
CREATE SEQUENCE IF NOT EXISTS doc_seq_SR START 1;
CREATE SEQUENCE IF NOT EXISTS doc_seq_SI START 1;
CREATE SEQUENCE IF NOT EXISTS doc_seq_ST START 1;
CREATE SEQUENCE IF NOT EXISTS doc_seq_SA START 1;
```

---

## 6. Tech Stack Mobile

| Kebutuhan | Library |
|---|---|
| Framework | Expo (React Native) |
| Navigation | Expo Router (file-based) |
| State Management | Zustand (sama seperti web) |
| HTTP Client | Axios + interceptor untuk token refresh |
| Barcode Scanner | `expo-camera` + `expo-barcode-scanner` |
| Push Notification | `expo-notifications` + Firebase FCM |
| Local Storage | `expo-secure-store` (untuk tokens) |
| Offline Support | React Query + persistence |
| UI Components | NativeWind (Tailwind for RN) |

---

## 7. Security Considerations untuk Mobile

### 7.1 Token Storage
- **JANGAN** simpan JWT di AsyncStorage (tidak encrypted)
- Gunakan `expo-secure-store` (Keychain iOS / Keystore Android)
- Refresh token harus di-revoke saat logout

### 7.2 Certificate Pinning
Pertimbangkan SSL certificate pinning untuk produksi agar tidak bisa di-intercept MITM.

### 7.3 API Key per Platform
Pertimbangkan API key tambahan di header (`X-App-Platform: mobile`) untuk track mobile request dan bisa disable jika ada abuse.

### 7.4 Jailbreak/Root Detection
Untuk lingkungan warehouse yang ketat, pertimbangkan deteksi device yang di-root/jailbreak.

---

## 8. Offline-First Strategy

Warehouse sering punya koneksi internet buruk (basement, rak besi). Mobile app harus handle offline:

| Fitur | Offline Support |
|---|---|
| Cek stok | ✅ Cache 5 menit, tampilkan label "Data lama" |
| Scan barcode | ✅ Dari cache — basic info |
| Buat penerimaan | ⚠️ Queue lokal, sync saat online |
| Konfirmasi pengeluaran | ❌ Butuh koneksi (transaksi finansial) |
| Lihat daftar transfer | ✅ Cache read-only |

**Implementasi:** React Query dengan `staleTime` + `cacheTime`, plus `NetInfo` untuk deteksi koneksi.

---

## 9. Phasing Plan

### Phase 1 — API Hardening (2–3 minggu)
Perbaiki semua issue di `01-api-audit.md` sebelum mobile menyentuh API:
- [ ] Fix race condition doc number
- [ ] Tambah refresh token
- [ ] Rate limiting login
- [ ] API versioning `/api/v1/`
- [ ] Fix transfers business error → 400
- [ ] Fix transfers.receive crash (null batch_id)
- [ ] Tambah endpoint barcode lookup
- [ ] Tambah endpoint quick-receive

### Phase 2 — Mobile Foundation (3–4 minggu)
- [ ] Setup Expo project
- [ ] Auth flow (login + silent refresh)
- [ ] Dashboard mobile
- [ ] Scan barcode → cek stok

### Phase 3 — Core Operations (4–5 minggu)
- [ ] Quick receive dari mobile
- [ ] Lihat & konfirmasi transfer masuk
- [ ] Pengeluaran sederhana dari mobile
- [ ] Offline cache strategy

### Phase 4 — Push Notifications (2 minggu)
- [ ] Integrasi FCM
- [ ] Job scheduler: cek low stock & expiry harian
- [ ] In-app notification center

### Phase 5 — Testing & Launch (2 minggu)
- [ ] UAT dengan staf gudang
- [ ] Deploy ke Google Play (internal track dulu)
- [ ] Monitor crash & error

---

## 10. Open Questions untuk Didiskusikan

1. **Platform target:** Android saja dulu, atau iOS juga?
2. **Distribusi:** Play Store publik, atau APK direct install ke device gudang?
3. **Koneksi server:** Mobile app konek langsung ke server GudangKu yang mana? (Supabase/VPS?) — perlu IP publik yang stabil
4. **Role per gudang:** Apakah staf_gudang hanya bisa lihat gudangnya sendiri di mobile?
5. **Barcode format:** Apakah semua item sudah punya barcode, atau ada yang manual entry?
