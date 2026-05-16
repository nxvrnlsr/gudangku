'use client';
import { useEffect, useState, useCallback } from 'react';
import { batchesApi } from '@/services/api';
import { IconBatch, IconRefresh, IconAlert } from '@/components/ui/Icons';

interface Batch { id: string; batch_number: string; item_name: string; sku: string; warehouse_name: string; remaining_qty: number; unit_symbol: string; expiry_date: string; days_until_expiry: number; expiry_status: string; cost_price: number; status: string; }
interface Summary { expired: number; critical: number; warning: number; safe: number; total_active: number; }

const EXPIRY_COLORS: Record<string, string> = { expired: '#EF4444', critical: '#F59E0B', warning: '#06B6D4', safe: '#10B981' };

export default function BatchesModule() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter]   = useState<'all'|'expired'|'critical'|'warning'|'safe'>('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, sumRes] = await Promise.all([
        batchesApi.getAll({ expiry_filter: filter === 'all' ? undefined : filter, limit: 100 }),
        batchesApi.getSummary(),
      ]);
      setBatches(batchRes.data.data);
      setSummary(sumRes.data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const FILTER_OPTS = [
    { key: 'all',      label: 'Semua',       count: summary?.total_active ?? 0, color: 'var(--text-secondary)' },
    { key: 'expired',  label: 'Expired',     count: summary?.expired  ?? 0,     color: '#EF4444' },
    { key: 'critical', label: 'Kritis',      count: summary?.critical ?? 0,     color: '#F59E0B' },
    { key: 'warning',  label: 'Peringatan',  count: summary?.warning  ?? 0,     color: '#06B6D4' },
    { key: 'safe',     label: 'Aman',        count: summary?.safe     ?? 0,     color: '#10B981' },
  ] as const;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconBatch size={20} color="var(--warning)" /> Monitor Batch & Expiry
        </h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconRefresh size={13} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid">
        {FILTER_OPTS.slice(1).map(opt => (
          <div key={opt.key} className="stat-card" style={{ cursor: 'pointer', borderColor: filter === opt.key ? EXPIRY_COLORS[opt.key] : undefined }}
            onClick={() => setFilter(opt.key as typeof filter)}>
            <div className="stat-icon" style={{ background: `${EXPIRY_COLORS[opt.key]}15`, border: `1px solid ${EXPIRY_COLORS[opt.key]}30` }}>
              <IconAlert size={16} color={EXPIRY_COLORS[opt.key]} />
            </div>
            <div className="stat-label">{opt.label}</div>
            <div className="stat-value" style={{ color: EXPIRY_COLORS[opt.key] }}>{opt.count}</div>
            <div className="stat-sub">batch</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2" style={{ flexShrink: 0 }}>
        {FILTER_OPTS.map(opt => (
          <button key={opt.key} className={`btn ${filter === opt.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setFilter(opt.key as typeof filter)}>
            {opt.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>({opt.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : batches.length === 0 ? (
            <div className="empty-state"><IconBatch size={40} color="var(--text-muted)" /><p>Tidak ada batch untuk filter ini</p></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>No. Batch</th><th>Barang</th><th>Gudang</th><th>Qty Sisa</th>
                <th>Tgl Kadaluarsa</th><th>Sisa Hari</th><th>Status</th>
              </tr></thead>
              <tbody>
                {batches.map(b => {
                  const statusClass = { expired: 'badge-danger', critical: 'badge-warning', warning: 'badge-info', safe: 'badge-success' }[b.expiry_status] ?? 'badge-neutral';
                  return (
                    <tr key={b.id}>
                      <td><code style={{ fontSize: 11, color: 'var(--primary)' }}>{b.batch_number}</code></td>
                      <td><div style={{ fontWeight: 500 }}>{b.item_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.sku}</div></td>
                      <td className="text-secondary">{b.warehouse_name}</td>
                      <td style={{ fontWeight: 600 }}>{b.remaining_qty} <span className="text-muted text-xs">{b.unit_symbol}</span></td>
                      <td className="text-secondary">{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('id-ID') : '—'}</td>
                      <td style={{ fontWeight: 600, color: EXPIRY_COLORS[b.expiry_status] ?? 'inherit' }}>
                        {b.days_until_expiry != null ? (b.days_until_expiry < 0 ? `${Math.abs(b.days_until_expiry)} hari lalu` : `${b.days_until_expiry} hari`) : '—'}
                      </td>
                      <td><span className={`badge ${statusClass}`}>{b.expiry_status?.toUpperCase()}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{batches.length} batch ditampilkan</span></div>
      </div>
    </div>
  );
}
