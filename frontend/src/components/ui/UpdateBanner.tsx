'use client';

/**
 * UpdateBanner — Notifikasi auto-update yang non-intrusive.
 *
 * Muncul di pojok kanan bawah saat ada update tersedia.
 * Menampilkan progress download dan tombol "Restart Sekarang".
 * Tidak muncul jika berjalan di browser biasa (bukan Electron).
 */

import { useEffect, useState, useRef } from 'react';

type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up-to-date' }
  | { status: 'available';    version: string }
  | { status: 'downloading';  version?: string; percent: number; bytesPs: number; total: number }
  | { status: 'ready';        version: string }
  | { status: 'error';        message: string };

export default function UpdateBanner() {
  const [update, setUpdate]         = useState<UpdateStatus>({ status: 'idle' });
  const [visible, setVisible]       = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const cleanupRef                  = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Hanya jalan di dalam Electron
    if (typeof window === 'undefined' || !(window as any).electronAPI?.onUpdateStatus) return;

    const cleanup = (window as any).electronAPI.onUpdateStatus((data: any) => {
      const s = data?.status as UpdateStatus['status'];

      if (s === 'available' || s === 'downloading' || s === 'ready') {
        setUpdate(data as UpdateStatus);
        setVisible(true);
        setDismissed(false);
      } else if (s === 'error') {
        setUpdate(data as UpdateStatus);
        // Hanya tampilkan error jika sudah pernah visible
        setVisible((prev) => prev);
      } else {
        setUpdate(data as UpdateStatus);
      }
    });

    cleanupRef.current = cleanup;
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, []);

  const handleInstall = async () => {
    if ((window as any).electronAPI?.installUpdate) {
      await (window as any).electronAPI.installUpdate();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => setVisible(false), 400);
  };

  if (!visible || dismissed) return null;

  const isReady       = update.status === 'ready';
  const isDownloading = update.status === 'downloading';
  const isAvailable   = update.status === 'available';
  const isError       = update.status === 'error';
  const percent       = isDownloading ? (update as any).percent ?? 0 : 0;
  const version       = (update as any).version ?? '';
  const speedKB       = isDownloading ? (update as any).bytesPs ?? 0 : 0;
  const totalMB       = isDownloading ? (update as any).total   ?? 0 : 0;

  return (
    <div
      style={{
        position:     'fixed',
        bottom:       '20px',
        right:        '20px',
        zIndex:       9999,
        width:        '320px',
        background:   'linear-gradient(135deg, #0f1827 0%, #111827 100%)',
        border:       isReady
          ? '1px solid rgba(16,185,129,0.4)'
          : isError
          ? '1px solid rgba(239,68,68,0.4)'
          : '1px solid rgba(79,142,247,0.3)',
        borderRadius: '14px',
        padding:      '16px 18px',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        animation:    'slideInBanner 0.35s cubic-bezier(0.22,1,0.36,1) both',
        fontFamily:   'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes slideInBanner {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        .update-btn-primary {
          background: linear-gradient(135deg, #4f8ef7, #7c6af6);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 0.15s, transform 0.1s;
          font-family: inherit;
        }
        .update-btn-primary:hover  { filter: brightness(1.15); transform: translateY(-1px); }
        .update-btn-primary:active { transform: translateY(0); }
        .update-btn-ready {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        .update-btn-dismiss {
          background: transparent;
          color: #4a5568;
          border: none;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          cursor: pointer;
          transition: color 0.15s;
          font-family: inherit;
        }
        .update-btn-dismiss:hover { color: #718096; }
        .update-progress-bar {
          height: 3px;
          background: #1e2a3a;
          border-radius: 4px;
          overflow: hidden;
          margin: 10px 0 4px;
        }
        .update-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4f8ef7, #a78bfa);
          border-radius: 4px;
          transition: width 0.5s ease;
        }
      `}</style>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Icon */}
          <span style={{ fontSize: '18px', lineHeight: 1 }}>
            {isReady ? '✅' : isError ? '⚠️' : isDownloading ? '⬇️' : '🔔'}
          </span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3 }}>
              {isReady
                ? `Update v${version} Siap`
                : isError
                ? 'Update Gagal'
                : isDownloading
                ? `Mengunduh Update${version ? ' v' + version : ''}...`
                : `Update Tersedia${version ? ' v' + version : ''}`}
            </div>
            <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '2px' }}>
              {isReady
                ? 'Akan diinstall saat aplikasi ditutup'
                : isError
                ? (update as any).message?.slice(0, 60) ?? 'Cek koneksi internet'
                : isDownloading
                ? `${percent}% · ${speedKB} KB/s · ${totalMB} MB`
                : 'Sedang diunduh di background...'}
            </div>
          </div>
        </div>

        {/* Dismiss button */}
        {!isDownloading && (
          <button
            className="update-btn-dismiss"
            onClick={handleDismiss}
            title="Tutup"
            style={{ marginLeft: '8px', flexShrink: 0, fontSize: '16px', lineHeight: 1, padding: '2px 6px' }}
          >
            ×
          </button>
        )}
      </div>

      {/* Progress bar (saat downloading) */}
      {isDownloading && (
        <>
          <div className="update-progress-bar">
            <div className="update-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <div style={{ fontSize: '11px', color: '#2d3748', textAlign: 'right' }}>
            {percent}%
          </div>
        </>
      )}

      {/* Action buttons */}
      {isReady && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            className="update-btn-primary update-btn-ready"
            onClick={handleInstall}
            style={{ flex: 1 }}
          >
            🔄 Restart &amp; Update Sekarang
          </button>
          <button className="update-btn-dismiss" onClick={handleDismiss}>
            Nanti
          </button>
        </div>
      )}
    </div>
  );
}
