'use client';
import { useEffect, useState, useCallback } from 'react';
import { receiptsApi } from '@/services/api';
import toast from 'react-hot-toast';

interface Receipt { id: string; doc_number: string; status: string; receipt_date: string; warehouse_name: string; supplier_name: string; received_by_name: string; line_count: number; total_value: number; }

const STATUS_BADGE: Record<string, string> = { draft: 'badge-neutral', confirmed: 'badge-success', cancelled: 'badge-danger' };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan' };

export default function ReceiptsModule() {
  const [receipts, setReceipts]   = useState<Receipt[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterStatus, setFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiptsApi.getAll({ status: filterStatus || undefined, limit: 50 });
      setReceipts(res.data.data);
    } catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async (id: string) => {
    if (!confirm('Batalkan dokumen ini?')) return;
    try {
      await receiptsApi.cancel(id);
      toast.success('Dokumen dibatalkan');
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal membatalkan');
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">📥 Penerimaan Barang</h1>
        <div className="filter-bar">
          <select className="form-input" style={{ width: 160 }} value={filterStatus} onChange={e => setFilter(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Dikonfirmasi</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        💡 <strong style={{ color: 'var(--primary)' }}>Cara kerja:</strong> Buat dokumen → Isi detail barang & batch → Konfirmasi → Stok otomatis bertambah dengan perhitungan AVCO
      </div>

      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : receipts.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📥</div><p>Belum ada penerimaan barang</p></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>No. Dokumen</th><th>Tanggal</th><th>Gudang</th><th>Supplier</th>
                <th>Jumlah Item</th><th>Total Nilai</th><th>Status</th><th>Aksi</th>
              </tr></thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id}>
                    <td><code style={{ fontSize: 11, color: 'var(--primary)' }}>{r.doc_number}</code></td>
                    <td className="text-secondary">{new Date(r.receipt_date).toLocaleDateString('id-ID')}</td>
                    <td>{r.warehouse_name}</td>
                    <td className="text-secondary">{r.supplier_name ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>{r.line_count}</td>
                    <td style={{ fontWeight: 500 }}>Rp {new Intl.NumberFormat('id-ID').format(r.total_value ?? 0)}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td>
                      {r.status === 'draft' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(r.id)}>Batal</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{receipts.length} dokumen</span></div>
      </div>
    </div>
  );
}
