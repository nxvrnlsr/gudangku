-- Migration 004: Phase 1 API Hardening
-- Tanggal: 2026-05-18
-- Isi:
--   1. refresh_tokens table           [C-04]
--   2. device_tokens table            [H-05 prep]
--   3. Doc number sequences           [C-01]

-- ─── 1. Refresh Tokens ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- ─── 2. Device Tokens (FCM) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token    TEXT NOT NULL,
  platform     VARCHAR(10) NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  device_name  TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fcm_token)
);

-- ─── 3. Doc Number Sequences ─────────────────────────────────────
-- Menggantikan COUNT(*)-based generation yang rawan race condition [C-01]
-- Format seq: digunakan bersama year-month prefix di aplikasi
CREATE SEQUENCE IF NOT EXISTS doc_seq_sr START 1;  -- Stock Receipts
CREATE SEQUENCE IF NOT EXISTS doc_seq_si START 1;  -- Stock Issues
CREATE SEQUENCE IF NOT EXISTS doc_seq_st START 1;  -- Stock Transfers
CREATE SEQUENCE IF NOT EXISTS doc_seq_sa START 1;  -- Stock Adjustments
CREATE SEQUENCE IF NOT EXISTS doc_seq_so START 1;  -- Stock Opname

-- ─── 4. Cleanup expired refresh tokens (opsional, jalankan manual / cron) ──
-- DELETE FROM refresh_tokens WHERE expires_at < NOW() AND revoked_at IS NOT NULL;
