'use client';
import { useEffect, useState, useCallback } from 'react';
import { receiptsApi, warehousesApi } from '@/services/api';
import ItemSelector from '@/components/ui/ItemSelector';
import { IconReceipt, IconRefresh, IconCancel, IconInfo, IconPlus, IconClose, IconCheck } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

/* ─── Types ─────────────────────────────────────────────────── */
interface Receipt {
  id: string; doc_number: string; status: string; receipt_date: string;
  warehouse_name: string; supplier_name: string; line_count: number; total_value: number;
}
interface ReceiptDetail {
  id: string; doc_number: string; status: string; receipt_date: string; supplier_name: string;
  notes: string; warehouse_name: string; received_by_name: string;
  lines: Array<{ item_name: string; sku: string; qty_received: number; unit_cost: number; batch_number: string; expiry_date: string; unit_symbol: string; }>;
}
interface Warehouse { id: string; name: string; }
interface LineItem { item_id: string; item_name: string; unit_symbol: string; qty_received: string; unit_cost: string; batch_number: string; expiry_date: string; mfg_date: string; }

const STATUS_BADGE: Record<string, string> = { draft: 'badge-neutral', confirmed: 'badge-success', cancelled: 'badge-danger' };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan' };
const fmt   = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const today = () => new Date().toISOString().split('T')[0];
const newLine = (): LineItem => ({ item_id: '', item_name: '', unit_symbol: '', qty_received: '1', unit_cost: '', batch_number: '', expiry_date: '', mfg_date: '' });

/* ─── Component ──────────────────────────────────────────────── */
export default function ReceiptsModule() {
  const [receipts,     setReceipts]     = useState<Receipt[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilter]       = useState('');
  const [warehouses,   setWarehouses]   = useState<Warehouse[]>([]);
  const [showCreate,   setShowCreate]   = useState(false);
  const [detailId,     setDetailId]     = useState<string|null>(null);
  const [detail,       setDetail]       = useState<ReceiptDetail|null>(null);
  const [saving,       setSaving]       = useState(false);
  const [isMaximized,  setIsMaximized]  = useState(false);

  // Form state
  const [form, setForm] = useState({ warehouse_id: '', supplier_name: '', receipt_date: today(), notes: '' });
  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  /* ── Fetchers ───────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiptsApi.getAll({ status: filterStatus || undefined, limit: 100 });
      setReceipts(res.data.data);
    } catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { warehousesApi.getAll().then(r => setWarehouses(r.data.data)); }, []);
  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    receiptsApi.getById(detailId).then(r => setDetail(r.data.data));
  }, [detailId]);

  /* ── Line Item Helpers ─────────────── */
  const updateLine = (idx: number, key: keyof LineItem, val: string) =>
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [key]: val } : l));
  const removeLine = (idx: number) => setLines(ls => ls.filter((_, i) => i !== idx));
  const addLine    = () => setLines(ls => [...ls, newLine()]);
  const totalNilai = lines.reduce((sum, l) => sum + (parseFloat(l.qty_received)||0) * (parseFloat(l.unit_cost)||0), 0);

  /* ── Submit ────────────────────────── */
  const handleSave = async (confirmAfter: boolean) => {
    if (!form.warehouse_id) { toast.error('Pilih gudang tujuan'); return; }
    if (lines.some(l => !l.item_id)) { toast.error('Semua baris harus memiliki barang'); return; }
    if (lines.some(l => !l.qty_received || parseFloat(l.qty_received) <= 0)) {
      toast.error('Qty setiap baris harus lebih dari 0'); return;
    }
    if (confirmAfter && lines.some(l => !l.batch_number || !l.expiry_date)) {
      toast.error('No. Batch dan Tanggal Kadaluarsa wajib diisi untuk konfirmasi'); return;
    }
    setSaving(true);
    try {
      const body = {
        warehouse_id:      form.warehouse_id,
        supplier_name:     form.supplier_name,
        receipt_date:      form.receipt_date,
        notes:             form.notes,
        confirm_immediately: confirmAfter,
        lines: lines.map(l => ({
          item_id:      l.item_id,
          qty:          parseFloat(l.qty_received),
          cost_price:   parseFloat(l.unit_cost) || 0,
          batch_number: l.batch_number || null,
          expiry_date:  l.expiry_date  || null,
          mfg_date:     l.mfg_date     || null,
        })),
      };
      const res = await receiptsApi.create(body);
      toast.success(res.data.message);

      setShowCreate(false);
      setIsMaximized(false);
      setForm({ warehouse_id: '', supplier_name: '', receipt_date: today(), notes: '' });
      setLines([newLine()]);
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };


  /* ── Confirm existing draft ─────────── */
  const handleConfirm = async (id: string, doc: string) => {
    try {
      await receiptsApi.confirm(id, {});
      toast.success(`${doc} dikonfirmasi — stok bertambah!`);
      fetchData();
      setDetailId(null);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal');
    }
  };
  const handleCancel  = async (id: string) => {
    if (!confirm('Batalkan dokumen ini?')) return;
    try { await receiptsApi.cancel(id); toast.success('Dibatalkan'); fetchData(); }
    catch { toast.error('Gagal'); }
  };

  /* ── Render ─────────────────────────── */
  return (
    <div className="page-wrap">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconReceipt size={20} color="var(--icon-info)" /> Penerimaan Barang
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
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={14} /> Buat Penerimaan
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <IconInfo size={15} color="var(--icon-primary)" />
        <span><strong style={{ color: 'var(--primary)' }}>Alur:</strong> Buat Penerimaan → Isi barang & batch → <strong>Simpan & Konfirmasi</strong> → Stok otomatis bertambah (AVCO)</span>
      </div>

      {/* ── Tabel ─────────────────────────────────────── */}
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : receipts.length === 0 ? (
            <div className="empty-state"><IconReceipt size={40} color="var(--icon-muted)" /><p>Belum ada penerimaan barang</p><button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconPlus size={13} /> Buat Sekarang</button></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>No. Dokumen</th><th>Tanggal</th><th>Gudang</th><th>Supplier</th>
                <th style={{ textAlign: 'right' }}>Item</th>
                <th style={{ textAlign: 'right' }}>Total Nilai</th>
                <th>Status</th><th>Aksi</th>
              </tr></thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} onClick={() => setDetailId(r.id)} style={{ cursor: 'pointer' }}>
                    <td><code style={{ fontSize: 11, color: 'var(--info)' }}>{r.doc_number}</code></td>
                    <td className="text-secondary">{new Date(r.receipt_date).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: 500 }}>{r.warehouse_name}</td>
                    <td className="text-secondary">{r.supplier_name ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>{r.line_count} item</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>Rp {fmt(r.total_value ?? 0)}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {r.status === 'draft' && <>
                          <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleConfirm(r.id, r.doc_number)}>
                            <IconCheck size={11} /> Konfirmasi
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconCancel size={11} /> Batal
                          </button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination">
          <span>{receipts.length} dokumen</span>
          <span className="text-secondary text-xs">Klik baris untuk melihat detail</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL: BUAT PENERIMAAN BARANG
      ══════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setIsMaximized(false); }}>
          <div className={`modal${isMaximized ? ' maximized' : ''}`} style={{ maxWidth: isMaximized ? undefined : 900, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Buat Penerimaan Barang</h2>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  Isi informasi pengiriman dan detail barang yang diterima
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn-maximize"
                  onClick={() => setIsMaximized(v => !v)}
                  title={isMaximized ? 'Perkecil' : 'Perbesar'}
                >
                  {isMaximized ? (
                    // Restore icon
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                      <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                    </svg>
                  ) : (
                    // Maximize icon
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  )}
                </button>
                <button className="btn btn-ghost btn-icon" onClick={() => { setShowCreate(false); setIsMaximized(false); }}><IconClose size={16} /></button>
              </div>
            </div>

            <div className="modal-body" style={{ gap: 20 }}>
              {/* ── Header Dokumen ─────────────────────── */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', padding: '16px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>
                  Informasi Dokumen
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Gudang Tujuan *</label>
                    <select className="form-input" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} required>
                      <option value="">— Pilih Gudang —</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Penerimaan *</label>
                    <input className="form-input" type="date" value={form.receipt_date} onChange={e => setForm(f => ({ ...f, receipt_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nama Supplier</label>
                    <input className="form-input" placeholder="PT. Supplier Nusantara" value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Catatan</label>
                    <input className="form-input" placeholder="Opsional..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* ── Line Items ─────────────────────────── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    Detail Barang ({lines.length} baris)
                  </p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLine} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <IconPlus size={12} /> Tambah Baris
                  </button>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  {/* Kolom header */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMaximized ? '3fr 90px 130px 140px 130px 36px' : '2.5fr 80px 110px 120px 110px 30px', gap: 8, padding: '8px 14px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <span>Barang</span><span>Qty</span><span>Harga Satuan</span><span>No. Batch</span><span>Tgl Kadaluarsa</span><span></span>
                  </div>

                  {lines.map((line, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: isMaximized ? '3fr 90px 130px 140px 130px 36px' : '2.5fr 80px 110px 120px 110px 30px', gap: 8, padding: '10px 14px', borderBottom: idx < lines.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                      {/* Pilih Barang */}
                      <ItemSelector
                        value={line.item_id}
                        onChange={item => {
                          if (item) {
                            updateLine(idx, 'item_id', item.id);
                            updateLine(idx, 'item_name', item.name);
                            updateLine(idx, 'unit_symbol', item.unit_symbol);
                            if (!line.unit_cost) updateLine(idx, 'unit_cost', String(item.cost_price));
                          } else {
                            setLines(ls => ls.map((l, i) => i === idx ? newLine() : l));
                          }
                        }}
                      />
                      {/* Qty */}
                      <input className="form-input" type="number" min="0.01" step="1" placeholder="1"
                        value={line.qty_received} onChange={e => updateLine(idx, 'qty_received', e.target.value)} />
                      {/* Unit Cost */}
                      <input className="form-input" type="number" min="0" step="1000" placeholder="Rp/unit"
                        value={line.unit_cost} onChange={e => updateLine(idx, 'unit_cost', e.target.value)} />
                      {/* Batch */}
                      <input className="form-input" placeholder="BT-2024-001"
                        value={line.batch_number}
                        onChange={e => updateLine(idx, 'batch_number', e.target.value)}
                      />
                      {/* Expiry */}
                      <input className="form-input" type="date"
                        value={line.expiry_date}
                        onChange={e => updateLine(idx, 'expiry_date', e.target.value)}
                      />
                      {/* Remove */}
                      <button type="button" onClick={() => lines.length > 1 && removeLine(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: lines.length > 1 ? 'pointer' : 'not-allowed', opacity: lines.length > 1 ? 1 : 0.3, display: 'flex', alignItems: 'center' }}>
                        <IconClose size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: 'var(--text-sm)', gap: 8, alignItems: 'center' }}>
                  <span className="text-muted">Total Nilai:</span>
                  <strong style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>Rp {fmt(totalNilai)}</strong>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Batal</button>
              <button type="button" className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconReceipt size={13} />}
                Simpan Draft
              </button>
              <button type="button" className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={14} />}
                Simpan & Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          MODAL: DETAIL DOKUMEN
      ══════════════════════════════════════════════════ */}
      {detailId && detail && (
        <div className="modal-overlay" onClick={() => setDetailId(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{detail.doc_number}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <span className={`badge ${STATUS_BADGE[detail.status]}`}>{STATUS_LABEL[detail.status]}</span>
                  <span className="text-muted text-xs">{new Date(detail.receipt_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetailId(null)}><IconClose size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 'var(--text-sm)' }}>
                {[['Gudang', detail.warehouse_name], ['Supplier', detail.supplier_name || '—'], ['Diterima oleh', detail.received_by_name], ['Catatan', detail.notes || '—']].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead><tr><th>Barang</th><th>Qty</th><th>Harga Satuan</th><th>Subtotal</th><th>No. Batch</th><th>Kadaluarsa</th></tr></thead>
                  <tbody>
                    {detail.lines?.map((l, i) => (
                      <tr key={i}>
                        <td><div style={{ fontWeight: 500 }}>{l.item_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.sku}</div></td>
                        <td>{l.qty_received} {l.unit_symbol}</td>
                        <td>Rp {fmt(l.unit_cost)}</td>
                        <td style={{ fontWeight: 500 }}>Rp {fmt(l.qty_received * l.unit_cost)}</td>
                        <td><code style={{ fontSize: 11 }}>{l.batch_number || '—'}</code></td>
                        <td className="text-secondary">{l.expiry_date ? new Date(l.expiry_date).toLocaleDateString('id-ID') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              {detail.status === 'draft' && (
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => handleConfirm(detail.id, detail.doc_number)}>
                  <IconCheck size={13} /> Konfirmasi Sekarang
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
