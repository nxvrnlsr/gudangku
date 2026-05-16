'use client';
import { useEffect, useState, useCallback } from 'react';
import { issuesApi } from '@/services/api';
import { IconIssue, IconRefresh, IconAlert } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

interface Issue { id: string; doc_number: string; status: string; issue_date: string; issue_type: string; warehouse_name: string; customer_name: string; issued_by_name: string; line_count: number; }
const STATUS_BADGE: Record<string, string> = { draft: 'badge-neutral', confirmed: 'badge-success', cancelled: 'badge-danger' };

export default function IssuesModule() {
  const [issues, setIssues]         = useState<Issue[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterStatus, setFilter]   = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await issuesApi.getAll({ status: filterStatus || undefined, limit: 50 });
      setIssues(res.data.data);
    } catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const TYPE_LABEL: Record<string, string> = { delivery: 'Pengiriman', sample: 'Sample', return: 'Retur', disposal: 'Disposal', internal: 'Internal' };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconIssue size={20} color="#8B5CF6" /> Pengeluaran Barang
        </h1>
        <div className="filter-bar">
          <select className="form-input" style={{ width: 160 }} value={filterStatus} onChange={e => setFilter(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Dikonfirmasi</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconRefresh size={13} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--r-md)', border: '1px solid rgba(139,92,246,0.25)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconAlert size={15} color="#8B5CF6" />
        <span><strong style={{ color: '#8B5CF6' }}>FEFO Otomatis:</strong> Saat dikonfirmasi, sistem otomatis memilih batch paling dekat kadaluarsanya untuk dikeluarkan duluan</span>
      </div>

      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : issues.length === 0 ? (
            <div className="empty-state"><IconIssue size={40} color="var(--text-muted)" /><p>Belum ada pengeluaran barang</p></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>No. Dokumen</th><th>Tanggal</th><th>Gudang</th><th>Jenis</th>
                <th>Pelanggan</th><th>Jml Item</th><th>Status</th>
              </tr></thead>
              <tbody>
                {issues.map(r => (
                  <tr key={r.id}>
                    <td><code style={{ fontSize: 11, color: '#8B5CF6' }}>{r.doc_number}</code></td>
                    <td className="text-secondary">{new Date(r.issue_date).toLocaleDateString('id-ID')}</td>
                    <td>{r.warehouse_name}</td>
                    <td><span className="badge badge-neutral">{TYPE_LABEL[r.issue_type] ?? r.issue_type}</span></td>
                    <td className="text-secondary">{r.customer_name ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>{r.line_count}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{issues.length} dokumen</span></div>
      </div>
    </div>
  );
}
