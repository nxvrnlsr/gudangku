/**
 * GudangKu — Electron Preload Script
 *
 * Jembatan aman antara Electron main process dan renderer (Next.js).
 * Dengan contextIsolation: true, renderer tidak bisa akses Node.js langsung.
 *
 * Expose hanya API yang benar-benar dibutuhkan via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── App info ──────────────────────────────────────────
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform:      process.platform,
  isElectron:    true,

  // ─── Auto-updater ──────────────────────────────────────
  // Dengarkan status update dari main process
  // Callback dipanggil dengan objek: { status, version?, percent?, bytesPs?, total?, message? }
  //
  // Status yang mungkin:
  //   "checking"    → sedang memeriksa update
  //   "available"   → update ditemukan, sedang diunduh
  //   "downloading" → sedang mengunduh (ada percent, bytesPs, total)
  //   "ready"       → update selesai diunduh, siap diinstall
  //   "up-to-date"  → tidak ada update baru
  //   "error"       → terjadi error (ada message)
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    // Kembalikan fungsi cleanup agar bisa di-unsubscribe
    return () => ipcRenderer.removeListener('update-status', handler);
  },

  // Minta main process untuk install update & restart sekarang
  installUpdate: () => ipcRenderer.invoke('install-update'),
});
