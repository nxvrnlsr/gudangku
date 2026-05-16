'use client';
import { useEffect, useState, useCallback } from 'react';
import { reportsApi } from '@/services/api';
import { useTabsStore, type TabId } from '@/stores/tabs.store';

interface DashboardData {
  total_items: number;
  total_warehouses: number;
  total_stock_value: number;
  batch_summary: { expired: number; critical: number; warning: number; safe: number };
  recent_transactions: Array<{ type: string; doc_number: string; doc_date: string; status: string }>;
}

const FEATURES: Array<{ id: TabId; icon: string; label: string; desc: string; color: string }> = [
  { id: 'items',      icon: '📦', label: 'Master Barang',  desc: 'Kelola SKU, kategori & satuan',    color: '#3B82F6' },
  { id: 'warehouses', icon: '🏭', label: 'Gudang & Stok',  desc: 'Posisi stok per gudang',           color: '#10B981' },
  { id: 'batches',    icon: '📅', label: 'Batch & Expiry', desc: 'Monitor tanggal kadaluarsa',        color: '#F59E0B' },
  { id: 'receipts',   icon: '📥', label: 'Penerimaan',     desc: 'Barang masuk & pembentukan batch',  color: '#06B6D4' },
  { id: 'issues',     icon: '📤', label: 'Pengeluaran',    desc: 'Barang keluar dengan FEFO otomatis',color: '#8B5CF6' },
  { id: 'transfers',  icon: '🔀', label: 'Transfer',       desc: 'Pindah stok antar gudang',          color: '#EC4899' },
  { id: 'reports',    icon: '📊', label: 'Laporan',        desc: 'Ekspor laporan ke Excel',           color: '#14B8A6' },
  { id: 'settings',   icon: '⚙️', label: 'Pengaturan',    desc: 'Konfigurasi sistem',                color: '#64748B' },
];

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const fmtCurrency = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

export default function DashboardModule() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { openTab } = useTabsStore();

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await reportsApi.dashboard();
      setData(res.data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const STATUS_BADGE: Record<string, string> = {
    draft: 'badge-neutral', confirmed: 'badge-success', cancelled: 'badge-danger',
    in_transit: 'badge-info', received: 'badge-success',
  };
  const TYPE_LABEL: Record<string, string> = { receipt: 'Penerimaan', issue: 'Pengeluaran', transfer: 'Transfer' };

  return (
    <div className="page-wrap" style={{ overflow: 'hidden auto' }}>
      {/* Greeting */}
      <div style={{ paddingBottom: 4 }}>
        <h1 className="text-2xl">Selamat datang di GudangKu 👋</h1>
        <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>📦</div>
              <div className="stat-label">Total Barang</div>
              <div className="stat-value">{fmt(data?.total_items ?? 0)}</div>
              <div className="stat-sub">item aktif</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>🏭</div>
              <div className="stat-label">Gudang Aktif</div>
              <div className="stat-value">{data?.total_warehouses ?? 0}</div>
              <div className="stat-sub">lokasi</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>💰</div>
              <div className="stat-label">Nilai Stok</div>
              <div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmtCurrency(data?.total_stock_value ?? 0)}</div>
              <div className="stat-sub">estimasi HPP</div>
            </div>
            <div className="stat-card" style={{ borderColor: (data?.batch_summary?.expired ?? 0) > 0 ? 'rgba(239,68,68,0.3)' : undefined }}>
              <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>📅</div>
              <div className="stat-label">Batch Kadaluarsa</div>
              <div className="stat-value" style={{ color: (data?.batch_summary?.expired ?? 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {data?.batch_summary?.expired ?? 0}
              </div>
              <div className="stat-sub text-warning">⚠ Kritis: {data?.batch_summary?.critical ?? 0}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1, minHeight: 0 }}>
            {/* App Launcher */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="font-semibold text-secondary text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Buka Modul
              </h2>
              <div className="launcher-grid">
                {FEATURES.map(f => (
                  <button key={f.id} className="launcher-card" onClick={() => openTab(f.id)}>
                    <div className="launcher-icon" style={{ background: f.color + '1A' }}>
                      {f.icon}
                    </div>
                    <div className="launcher-name">{f.label}</div>
                    <div className="launcher-desc">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                🕐 Transaksi Terakhir
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {(data?.recent_transactions ?? []).length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">📄</div><p>Belum ada transaksi</p></div>
                ) : (
                  <table className="data-table">
                    <thead><tr>
                      <th>No. Dokumen</th><th>Jenis</th><th>Tanggal</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {data?.recent_transactions.map((tx, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{tx.doc_number}</td>
                          <td><span className="badge badge-neutral">{TYPE_LABEL[tx.type]}</span></td>
                          <td className="text-secondary">{new Date(tx.doc_date).toLocaleDateString('id-ID')}</td>
                          <td><span className={`badge ${STATUS_BADGE[tx.status] ?? 'badge-neutral'}`}>{tx.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
