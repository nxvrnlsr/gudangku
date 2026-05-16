'use client';
import { useEffect, useState, useCallback } from 'react';
import { transfersApi } from '@/services/api';
import { IconTransfer, IconRefresh, IconSend, IconCheck, IconAlert } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

interface Transfer { id: string; doc_number: string; status: string; transfer_date: string; from_warehouse_name: string; to_warehouse_name: string; requested_by_name: string; line_count: number; }
const STATUS_BADGE: Record<string, string> = { draft: 'badge-neutral', in_transit: 'badge-info', received: 'badge-success', cancelled: 'badge-danger' };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', in_transit: 'Dalam Perjalanan', received: 'Diterima', cancelled: 'Dibatalkan' };

export default function TransfersModule() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transfersApi.getAll({ limit: 50 });
      setTransfers(res.data.data);
    } catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDispatch = async (id: string) => {
    if (!confirm('Konfirmasi pengiriman? Stok gudang asal akan berkurang.')) return;
    try { await transfersApi.dispatch(id); toast.success('Transfer dikirim. Status: Dalam Perjalanan'); fetchData(); }
    catch (err: unknown) { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal'); }
  };

  const handleReceive = async (id: string) => {
    if (!confirm('Konfirmasi penerimaan? Stok gudang tujuan akan bertambah.')) return;
    try { await transfersApi.receive(id); toast.success('Transfer diterima. Stok gudang tujuan bertambah.'); fetchData(); }
    catch (err: unknown) { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal'); }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconTransfer size={20} color="#EC4899" /> Transfer Antar Gudang
        </h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconRefresh size={13} /> Refresh
        </button>
      </div>

      <div style={{ padding: '10px 14px', background: 'rgba(236,72,153,0.08)', borderRadius: 'var(--r-md)', border: '1px solid rgba(236,72,153,0.25)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconAlert size={15} color="#EC4899" />
        <span><strong style={{ color: '#EC4899' }}>2 Tahap:</strong> Kirim (stok keluar dari gudang asal) &rarr; Terima (stok masuk ke gudang tujuan)</span>
      </div>

      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : transfers.length === 0 ? (
            <div className="empty-state"><IconTransfer size={40} color="var(--text-muted)" /><p>Belum ada transfer</p></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>No. Dokumen</th><th>Tanggal</th><th>Dari</th><th>Ke</th>
                <th>Item</th><th>Status</th><th>Aksi</th>
              </tr></thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id}>
                    <td><code style={{ fontSize: 11, color: '#EC4899' }}>{t.doc_number}</code></td>
                    <td className="text-secondary">{new Date(t.transfer_date).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: 500 }}>{t.from_warehouse_name}</td>
                    <td style={{ fontWeight: 500 }}>{t.to_warehouse_name}</td>
                    <td style={{ textAlign: 'center' }}>{t.line_count}</td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                    <td>
                      <div className="flex gap-2">
                        {t.status === 'draft' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleDispatch(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconSend size={11} /> Kirim
                          </button>
                        )}
                        {t.status === 'in_transit' && (
                          <button className="btn btn-secondary btn-sm" style={{ borderColor: 'var(--success)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleReceive(t.id)}>
                            <IconCheck size={12} /> Terima
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{transfers.length} dokumen</span></div>
      </div>
    </div>
  );
}
