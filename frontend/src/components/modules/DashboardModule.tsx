'use client';
import { useEffect, useState, useCallback } from 'react';
import { reportsApi } from '@/services/api';
import { useTabsStore, type TabId } from '@/stores/tabs.store';
import {
  IconPackage, IconWarehouse, IconBatch, IconReceipt, IconIssue,
  IconTransfer, IconReport, IconSettings, IconDollar, IconBox, IconClock,
} from '@/components/ui/Icons';
import type { ComponentType } from 'react';

interface DashboardData {
  total_items: number;
  total_warehouses: number;
  total_stock_value: number;
  batch_summary: { expired: number; critical: number; warning: number; safe: number };
  recent_transactions: Array<{ type: string; doc_number: string; doc_date: string; status: string }>;
}

// Feature launcher definitions with icon components
const FEATURES: Array<{
  id: TabId;
  Icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  desc: string;
  color: string;
  glow: string;
}> = [
  { id: 'items',      Icon: IconPackage,   label: 'Master Barang',  desc: 'Kelola SKU, kategori & satuan',      color: '#3B82F6', glow: 'rgba(59,130,246,0.25)' },
  { id: 'warehouses', Icon: IconWarehouse, label: 'Gudang & Stok',  desc: 'Posisi stok real-time per gudang',   color: '#10B981', glow: 'rgba(16,185,129,0.25)' },
  { id: 'batches',    Icon: IconBatch,     label: 'Batch & Expiry', desc: 'Monitor tanggal kadaluarsa FEFO',    color: '#F59E0B', glow: 'rgba(245,158,11,0.25)'  },
  { id: 'receipts',   Icon: IconReceipt,   label: 'Penerimaan',     desc: 'Barang masuk & kalkulasi AVCO',      color: '#06B6D4', glow: 'rgba(6,182,212,0.25)'   },
  { id: 'issues',     Icon: IconIssue,     label: 'Pengeluaran',    desc: 'Barang keluar, FEFO otomatis',       color: '#8B5CF6', glow: 'rgba(139,92,246,0.25)'  },
  { id: 'transfers',  Icon: IconTransfer,  label: 'Transfer',       desc: 'Pindah stok antar gudang',           color: '#EC4899', glow: 'rgba(236,72,153,0.25)'  },
  { id: 'reports',    Icon: IconReport,    label: 'Laporan',        desc: 'Ekspor data ke Excel terorganisir',  color: '#14B8A6', glow: 'rgba(20,184,166,0.25)'  },
  { id: 'settings',   Icon: IconSettings,  label: 'Pengaturan',    desc: 'Konfigurasi sistem & export path',   color: '#64748B', glow: 'rgba(100,116,139,0.2)'  },
];

const fmt         = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const fmtCurrency = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge-neutral', confirmed: 'badge-success', cancelled: 'badge-danger',
  in_transit: 'badge-info', received: 'badge-success',
};
const TYPE_ICON: Record<string, ComponentType<{ size?: number; color?: string }>> = {
  receipt: IconReceipt, issue: IconIssue, transfer: IconTransfer,
};
const TYPE_LABEL: Record<string, string> = {
  receipt: 'Penerimaan', issue: 'Pengeluaran', transfer: 'Transfer',
};

export default function DashboardModule() {
  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { openTab }         = useTabsStore();

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await reportsApi.dashboard();
      setData(res.data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return (
    <div className="page-wrap" style={{ overflow: 'hidden auto' }}>
      {/* ── Greeting ───────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Selamat datang
        </h1>
        <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* ── Stat Cards ──────────────────────────────────────── */}
          <div className="stat-grid">
            {/* Total Barang */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <IconPackage size={18} color="#3B82F6" />
              </div>
              <div className="stat-label">Total Barang</div>
              <div className="stat-value">{fmt(data?.total_items ?? 0)}</div>
              <div className="stat-sub">item aktif</div>
            </div>

            {/* Total Gudang */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <IconWarehouse size={18} color="#10B981" />
              </div>
              <div className="stat-label">Gudang Aktif</div>
              <div className="stat-value">{data?.total_warehouses ?? 0}</div>
              <div className="stat-sub">lokasi</div>
            </div>

            {/* Nilai Stok */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <IconDollar size={18} color="#F59E0B" />
              </div>
              <div className="stat-label">Nilai Stok</div>
              <div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmtCurrency(data?.total_stock_value ?? 0)}</div>
              <div className="stat-sub">estimasi HPP</div>
            </div>

            {/* Batch Expiry */}
            <div className="stat-card" style={{
              borderColor: (data?.batch_summary?.expired ?? 0) > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)',
            }}>
              <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <IconBatch size={18} color="#EF4444" />
              </div>
              <div className="stat-label">Batch Expired</div>
              <div className="stat-value" style={{ color: (data?.batch_summary?.expired ?? 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {data?.batch_summary?.expired ?? 0}
              </div>
              <div className="stat-sub" style={{ color: 'var(--warning)' }}>
                Kritis: {data?.batch_summary?.critical ?? 0}
              </div>
            </div>
          </div>

          {/* ── Main Grid ─────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1, minHeight: 0 }}>

            {/* App Launcher */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Modul
              </p>
              <div className="launcher-grid">
                {FEATURES.map(f => (
                  <button key={f.id} className="launcher-card" onClick={() => openTab(f.id)} style={{ border: 'none', textAlign: 'left' }}>
                    {/* Icon Container — UIverse-inspired glow effect */}
                    <div style={{
                      width: 48, height: 48,
                      borderRadius: 14,
                      background: `${f.color}18`,
                      border: `1px solid ${f.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 20px ${f.glow}`,
                      transition: 'box-shadow 0.2s, transform 0.2s',
                      flexShrink: 0,
                    }}>
                      <f.Icon size={22} color={f.color} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div className="launcher-name">{f.label}</div>
                      <div className="launcher-desc">{f.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <IconClock size={14} color="var(--icon-muted)" />
                Transaksi Terakhir
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {(data?.recent_transactions ?? []).length === 0 ? (
                  <div className="empty-state">
                    <IconBox size={36} color="var(--icon-muted)" />
                    <p>Belum ada transaksi</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead><tr>
                      <th>No. Dokumen</th><th>Jenis</th><th>Tanggal</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {data?.recent_transactions.map((tx, i) => {
                        const TxIcon = TYPE_ICON[tx.type];
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500, fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--primary)' }}>
                              {tx.doc_number}
                            </td>
                            <td>
                              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {TxIcon && <TxIcon size={11} />}
                                {TYPE_LABEL[tx.type]}
                              </span>
                            </td>
                            <td className="text-secondary text-xs">
                              {new Date(tx.doc_date).toLocaleDateString('id-ID')}
                            </td>
                            <td>
                              <span className={`badge ${STATUS_BADGE[tx.status] ?? 'badge-neutral'}`}>
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
