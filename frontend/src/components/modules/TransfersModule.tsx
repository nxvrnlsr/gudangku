'use client';
import { useEffect, useState, useCallback } from 'react';
import { transfersApi, warehousesApi } from '@/services/api';
import ItemSelector from '@/components/ui/ItemSelector';
import { IconTransfer, IconRefresh, IconAlert, IconPlus, IconClose, IconCheck, IconSend, IconInfo } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

/* ─── Types ─────────────────────────────────────────────────── */
interface Transfer {
  id: string; doc_number: string; status: string; transfer_date: string;
  from_warehouse_name: string; to_warehouse_name: string; line_count: number;
}
interface TransferDetail {
  id: string; doc_number: string; status: string; transfer_date: string; notes: string;
  from_warehouse_name: string; to_warehouse_name: string; requested_by_name: string;
  lines: Array<{ item_name: string; sku: string; qty_to_transfer: number; qty_transferred: number; unit_symbol: string; }>;
}
interface Warehouse { id: string; name: string; }
interface LineItem  { item_id: string; item_name: string; unit_symbol: string; qty_to_transfer: string; }

const STATUS_BADGE: Record<string, string> = { draft: 'badge-neutral', in_transit: 'badge-info', received: 'badge-success', cancelled: 'badge-danger' };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', in_transit: 'Dalam Perjalanan', received: 'Diterima', cancelled: 'Dibatalkan' };
const today   = () => new Date().toISOString().split('T')[0];
const newLine = (): LineItem => ({ item_id: '', item_name: '', unit_symbol: '', qty_to_transfer: '1' });

/* ─── Component ─────────────────────────────────────────────── */
export default function TransfersModule() {
  const [transfers,  setTransfers]  = useState<Transfer[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId,   setDetailId]   = useState<string|null>(null);
  const [detail,     setDetail]     = useState<TransferDetail|null>(null);
  const [saving,     setSaving]     = useState(false);

  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', transfer_date: today(), notes: '' });
  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  /* ── Fetchers ─────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const res = await transfersApi.getAll({ limit: 100 }); setTransfers(res.data.data); }
    catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { warehousesApi.getAll().then(r => setWarehouses(r.data.data)); }, []);
  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    transfersApi.getById(detailId).then(r => setDetail(r.data.data));
  }, [detailId]);

  /* ── Line Helpers ─────────────────── */
  const updateLine = (idx: number, key: keyof LineItem, val: string) =>
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [key]: val } : l));
  const removeLine = (idx: number) => setLines(ls => ls.filter((_, i) => i !== idx));
  const addLine    = () => setLines(ls => [...ls, newLine()]);

  /* ── Submit ───────────────────────── */
  const handleSave = async () => {
    if (!form.from_warehouse_id || !form.to_warehouse_id) { toast.error('Pilih gudang asal dan tujuan'); return; }
    if (form.from_warehouse_id === form.to_warehouse_id) { toast.error('Gudang asal dan tujuan tidak boleh sama'); return; }
    if (lines.some(l => !l.item_id || !l.qty_to_transfer)) { toast.error('Semua baris harus diisi'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        lines: lines.map(l => ({ item_id: l.item_id, qty_to_transfer: parseFloat(l.qty_to_transfer) })),
      };
      const res = await transfersApi.create(body);
      toast.success(`✅ ${res.data.data.doc_number} dibuat — siap untuk dikirim`);
      setShowCreate(false);
      setForm({ from_warehouse_id: '', to_warehouse_id: '', transfer_date: today(), notes: '' });
      setLines([newLine()]);
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleDispatch = async (id: string, doc: string) => {
    if (!confirm(`Kirim transfer ${doc}?\nStok gudang ASAL akan berkurang.`)) return;
    try { await transfersApi.dispatch(id); toast.success(`${doc} dikirim — status: Dalam Perjalanan`); fetchData(); setDetailId(null); }
    catch (err: unknown) { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal'); }
  };
  const handleReceive = async (id: string, doc: string) => {
    if (!confirm(`Konfirmasi penerimaan ${doc}?\nStok gudang TUJUAN akan bertambah.`)) return;
    try { await transfersApi.receive(id); toast.success(`${doc} diterima — stok gudang tujuan bertambah`); fetchData(); setDetailId(null); }
    catch (err: unknown) { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal'); }
  };

  /* ── Render ─────────────────────────── */
  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconTransfer size={20} color="#EC4899" /> Transfer Antar Gudang
        </h1>
        <div className="filter-bar">
          <button className="btn btn-secondary btn-sm" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconRefresh size={13} /> Refresh</button>
          <button className="btn btn-primary" style={{ background: '#BE185D', borderColor: '#BE185D', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCreate(true)}>
            <IconPlus size={14} /> Buat Transfer
          </button>
        </div>
      </div>

      {/* Alur Info */}
      <div style={{ padding: '10px 14px', background: 'rgba(236,72,153,0.08)', borderRadius: 'var(--r-md)', border: '1px solid rgba(236,72,153,0.2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <IconAlert size={15} color="#EC4899" />
        <span>
          <strong style={{ color: '#EC4899' }}>Alur 2 Tahap:</strong>
          &nbsp;Buat Transfer (Draft) &rarr; <strong>Kirim</strong> (stok keluar dari gudang asal) &rarr; <strong>Terima</strong> (stok masuk ke gudang tujuan)
        </span>
      </div>

      {/* Tabel */}
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : transfers.length === 0 ? (
            <div className="empty-state">
              <IconTransfer size={40} color="var(--text-muted)" /><p>Belum ada transfer</p>
              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCreate(true)}><IconPlus size={13} /> Buat Transfer</button>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>No. Dokumen</th><th>Tanggal</th><th>Dari Gudang</th><th>Ke Gudang</th>
                <th style={{ textAlign: 'right' }}>Item</th><th>Status</th><th>Aksi</th>
              </tr></thead>
              <tbody>
                {transfers.map(t => (
                  <tr key={t.id} onClick={() => setDetailId(t.id)} style={{ cursor: 'pointer' }}>
                    <td><code style={{ fontSize: 11, color: '#EC4899' }}>{t.doc_number}</code></td>
                    <td className="text-secondary">{new Date(t.transfer_date).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: 500 }}>{t.from_warehouse_name}</td>
                    <td style={{ fontWeight: 500 }}>{t.to_warehouse_name}</td>
                    <td style={{ textAlign: 'right' }}>{t.line_count} item</td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {t.status === 'draft' && (
                          <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleDispatch(t.id, t.doc_number)}>
                            <IconSend size={11} /> Kirim
                          </button>
                        )}
                        {t.status === 'in_transit' && (
                          <button className="btn btn-secondary btn-sm" style={{ borderColor: 'var(--success)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleReceive(t.id, t.doc_number)}>
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
        <div className="pagination"><span>{transfers.length} dokumen</span><span className="text-secondary text-xs">Klik baris untuk detail</span></div>
      </div>

      {/* ═══ MODAL: BUAT TRANSFER ═══ */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Buat Transfer Barang</h2>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Dokumen akan disimpan sebagai Draft — klik Kirim untuk memulai transfer</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><IconClose size={16} /></button>
            </div>
            <div className="modal-body" style={{ gap: 20 }}>
              {/* Header */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>Informasi Transfer</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Dari Gudang *</label>
                    <select className="form-input" value={form.from_warehouse_id} onChange={e => setForm(f => ({ ...f, from_warehouse_id: e.target.value }))}>
                      <option value="">— Pilih Gudang Asal —</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ke Gudang *</label>
                    <select className="form-input" value={form.to_warehouse_id} onChange={e => setForm(f => ({ ...f, to_warehouse_id: e.target.value }))}>
                      <option value="">— Pilih Gudang Tujuan —</option>
                      {warehouses.filter(w => w.id !== form.from_warehouse_id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Transfer *</label>
                    <input className="form-input" type="date" value={form.transfer_date} onChange={e => setForm(f => ({ ...f, transfer_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Catatan</label>
                    <input className="form-input" placeholder="Opsional..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Lines */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Barang yang Ditransfer</p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLine} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><IconPlus size={12} /> Tambah Baris</button>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 120px 30px', gap: 8, padding: '8px 14px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <span>Barang</span><span>Qty Transfer</span><span></span>
                  </div>
                  {lines.map((line, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 120px 30px', gap: 8, padding: '10px 14px', borderBottom: idx < lines.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                      <ItemSelector value={line.item_id} onChange={item => {
                        if (item) { updateLine(idx, 'item_id', item.id); updateLine(idx, 'item_name', item.name); updateLine(idx, 'unit_symbol', item.unit_symbol); }
                        else { setLines(ls => ls.map((l, i) => i === idx ? newLine() : l)); }
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input className="form-input" type="number" min="0.01" step="0.01" placeholder="1"
                          value={line.qty_to_transfer} onChange={e => updateLine(idx, 'qty_to_transfer', e.target.value)}
                          style={{ textAlign: 'right' }} />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{line.unit_symbol}</span>
                      </div>
                      <button type="button" onClick={() => lines.length > 1 && removeLine(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: lines.length > 1 ? 'pointer' : 'not-allowed', opacity: lines.length > 1 ? 1 : 0.3, display: 'flex' }}>
                        <IconClose size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Batal</button>
              <button type="button" className="btn btn-primary" style={{ background: '#BE185D', borderColor: '#BE185D', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconTransfer size={13} />} Buat Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: DETAIL ═══ */}
      {detailId && detail && (
        <div className="modal-overlay" onClick={() => setDetailId(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{detail.doc_number}</h2>
                <span className={`badge ${STATUS_BADGE[detail.status]}`} style={{ marginTop: 4, display: 'inline-flex' }}>{STATUS_LABEL[detail.status]}</span>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetailId(null)}><IconClose size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Dari Gudang', detail.from_warehouse_name], ['Ke Gudang', detail.to_warehouse_name], ['Tanggal', new Date(detail.transfer_date).toLocaleDateString('id-ID')], ['Dibuat oleh', detail.requested_by_name], ['Catatan', detail.notes || '—']].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 'var(--text-sm)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead><tr><th>Barang</th><th>Qty Diminta</th><th>Qty Ditransfer</th></tr></thead>
                  <tbody>
                    {detail.lines?.map((l, i) => (
                      <tr key={i}>
                        <td><div style={{ fontWeight: 500 }}>{l.item_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.sku}</div></td>
                        <td>{l.qty_to_transfer} {l.unit_symbol}</td>
                        <td style={{ fontWeight: 500, color: 'var(--success)' }}>{l.qty_transferred ?? '—'} {l.unit_symbol}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Alur status visual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)' }}>
                {[
                  { s: 'draft',      label: '1. Draft' },
                  { s: 'in_transit', label: '2. Dikirim' },
                  { s: 'received',   label: '3. Diterima' },
                ].map((step, i, arr) => {
                  const order = ['draft', 'in_transit', 'received'];
                  const done  = order.indexOf(detail.status) >= order.indexOf(step.s);
                  return (
                    <div key={step.s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: done ? 'var(--success)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {done && <IconCheck size={11} color="white" />}
                        </div>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: done ? 600 : 400, color: done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step.label}</span>
                      </div>
                      {i < arr.length - 1 && <div style={{ flex: 1, height: 2, background: done && order.indexOf(detail.status) > order.indexOf(step.s) ? 'var(--success)' : 'var(--border)', borderRadius: 2 }} />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              {detail.status === 'draft' && (
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleDispatch(detail.id, detail.doc_number)}>
                  <IconSend size={13} /> Kirim Sekarang
                </button>
              )}
              {detail.status === 'in_transit' && (
                <button className="btn btn-secondary" style={{ borderColor: 'var(--success)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleReceive(detail.id, detail.doc_number)}>
                  <IconCheck size={13} /> Konfirmasi Diterima
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setDetailId(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
