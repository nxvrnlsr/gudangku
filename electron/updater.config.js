/**
 * GudangKu — Konfigurasi Auto-Updater
 *
 * File ini menentukan dari mana aplikasi mengambil update.
 * Untuk berpindah provider, cukup ubah bagian yang sesuai
 * dan jalankan ulang `npm run electron:build`.
 *
 * ──────────────────────────────────────────────
 * OPSI B — GitHub Releases (aktif saat ini)
 * ──────────────────────────────────────────────
 *   provider : "github"
 *   owner    : username atau org GitHub Anda
 *   repo     : nama repository GitHub Anda
 *   private  : true  → butuh GH_TOKEN di environment
 *              false → repo publik, tidak perlu token
 *
 * ──────────────────────────────────────────────
 * OPSI C — Custom HTTP/HTTPS Server (masa depan)
 * ──────────────────────────────────────────────
 *   provider : "generic"
 *   url      : URL folder yang berisi file installer
 *              + latest.yml (di-generate oleh electron-builder)
 *   Contoh   : "https://updates.perusahaan.com/gudangku"
 *
 * ──────────────────────────────────────────────
 * OPSI A — Folder LAN / NAS
 * ──────────────────────────────────────────────
 *   provider : "generic"
 *   url      : "file:////NAS-SERVER/share/gudangku-updates"
 */

module.exports = {
  // ─── AKTIF SEKARANG: GitHub Releases ────────────────────
  provider: "github",
  owner:    "nxvrnlsr",  // ← WAJIB DIISI
  repo:     "gudangku",                            // ← Sesuaikan nama repo
  private:  false,                                 // ← Ganti true jika repo private

  // ─── UNTUK BERALIH KE OPSI C NANTI, GANTI MENJADI: ─────
  // provider: "generic",
  // url:      "https://updates.domain-anda.com/gudangku",
};
