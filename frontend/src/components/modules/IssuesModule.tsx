'use client';
import { useEffect, useState, useCallback } from 'react';
import { issuesApi, warehousesApi } from '@/services/api';
import ItemSelector from '@/components/ui/ItemSelector';
import { IconIssue, IconRefresh, IconAlert, IconPlus, IconClose, IconCheck, IconInfo } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

/* ─── Types ─────────────────────────────────────────────────── */
interface Issue {
  id: string; doc_number: string; status: string; issue_date: string;
  issue_type: string; warehouse_name: string; customer_name: string; line_count: number;
}
interface IssueDetail {
  id: string; doc_number: string; status: string; issue_date: string; issue_type: string;
  warehouse_name: string; customer_name: string; notes: string; issued_by_name: string;
  lines: Array<{ item_name: string; sku: string; qty_requested: number; qty_issued: number; unit_symbol: string; batch_details: Array<{ batch_number: string; qty_issued: number; expiry_date: string; }> }>;
}
interface Warehouse { id: string; name: string; }
interface LineItem  { item_id: string; item_name: string; unit_symbol: string; qty_requested: string; }

const ISSUE_TYPES = [
  { value: 'delivery', label: 'Pengiriman ke Pelanggan' },
  { value: 'sample',   label: 'Sample / Promosi' },
  { value: 'return',   label: 'Retur ke Supplier' },
  { value: 'disposal', label: 'Disposal / Rusak' },
  { value: 'internal', label: 'Pemakaian Internal' },
];
const STATUS_BADGE: Record<string, string> = { draft: 'badge-neutral', confirmed: 'badge-success', cancelled: 'badge-danger' };
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan' };
const fmt   = (n: number) => new Intl.NumberFormat('id-ID').format(n);
const today = () => new Date().toISOString().split('T')[0];
const newLine = (): LineItem => ({ item_id: '', item_name: '', unit_symbol: '', qty_requested: '1' });

/* ─── Component ─────────────────────────────────────────────── */
export default function IssuesModule() {
  const [issues,       setIssues]       = useState<Issue[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilter]       = useState('');
  const [warehouses,   setWarehouses]   = useState<Warehouse[]>([]);
  const [showCreate,   setShowCreate]   = useState(false);
  const [detailId,     setDetailId]     = useState<string|null>(null);
  const [detail,       setDetail]       = useState<IssueDetail|null>(null);
  const [saving,       setSaving]       = useState(false);

  // Form state
  const [form, setForm] = useState({ warehouse_id: '', issue_date: today(), issue_type: 'delivery', customer_name: '', notes: '' });
  const [lines, setLines] = useState<LineItem[]>([newLine()]);

  /* ── Fetchers ─────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await issuesApi.getAll({ status: filterStatus || undefined, limit: 100 });
      setIssues(res.data.data);
    } catch { toast.error('Gagal memuat data'); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { warehousesApi.getAll().then(r => setWarehouses(r.data.data)); }, []);
  useEffect(() => {
    if (!detailId) { setDetail(null); return; }
    issuesApi.getById(detailId).then(r => setDetail(r.data.data));
  }, [detailId]);

  /* ── Line Helpers ─────────────────── */
  const updateLine = (idx: number, key: keyof LineItem, val: string) =>
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [key]: val } : l));
  const removeLine = (idx: number) => setLines(ls => ls.filter((_, i) => i !== idx));
  const addLine    = () => setLines(ls => [...ls, newLine()]);

  /* ── Submit ───────────────────────── */
  const handleSave = async (confirmAfter: boolean) => {
    if (!form.warehouse_id) { toast.error('Pilih gudang asal'); return; }
    if (lines.some(l => !l.item_id || !l.qty_requested)) { toast.error('Semua baris harus memiliki barang dan qty'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        lines: lines.map(l => ({ item_id: l.item_id, qty_requested: parseFloat(l.qty_requested) })),
      };
      const res = await issuesApi.create(body);
      const { id, doc_number } = res.data.data;

      if (confirmAfter) {
        await issuesApi.confirm(id);
        toast.success(`✅ ${doc_number} dikonfirmasi — stok dikurangi (FEFO)`);
      } else {
        toast.success(`📄 ${doc_number} disimpan sebagai draft`);
      }

      setShowCreate(false);
      setForm({ warehouse_id: '', issue_date: today(), issue_type: 'delivery', customer_name: '', notes: '' });
      setLines([newLine()]);
      fetchData();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleConfirm = async (id: string, doc: string) => {
    try { await issuesApi.confirm(id); toast.success(`${doc} dikonfirmasi — FEFO diterapkan`); fetchData(); setDetailId(null); }
    catch (err: unknown) { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal'); }
  };
  const handleCancel = async (id: string) => {
    if (!confirm('Batalkan dokumen ini?')) return;
    try { await issuesApi.cancel(id); toast.success('Dibatalkan'); fetchData(); }
    catch { toast.error('Gagal'); }
  };

  const TYPE_LABEL: Record<string, string> = Object.fromEntries(ISSUE_TYPES.map(t => [t.value, t.label]));

  /* ── Render ─────────────────────────── */
  return (
    <div className="page-wrap">
      {/* Header */}
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
          <button className="btn btn-primary" style={{ background: '#7C3AED', borderColor: '#7C3AED', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCreate(true)}>
            <IconPlus size={14} /> Buat Pengeluaran
          </button>
        </div>
      </div>

      {/* FEFO Banner */}
      <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--r-md)', border: '1px solid rgba(139,92,246,0.25)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <IconAlert size={15} color="#8B5CF6" />
        <span><strong style={{ color: '#8B5CF6' }}>FEFO Otomatis:</strong> Saat dikonfirmasi, sistem memilih batch dengan tanggal kadaluarsa paling awal untuk dikeluarkan. Kamu hanya perlu isi qty — sisanya otomatis.</span>
      </div>

      {/* Tabel */}
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : issues.length === 0 ? (
            <div className="empty-state">
              <IconIssue size={40} color="var(--text-muted)" /><p>Belum ada pengeluaran barang</p>
              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7C3AED', borderColor: '#7C3AED' }} onClick={() => setShowCreate(true)}>
                <IconPlus size={13} /> Buat Sekarang
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>No. Dokumen</th><th>Tanggal</th><th>Gudang</th><th>Jenis</th>
                <th>Pelanggan / Tujuan</th><th style={{ textAlign: 'right' }}>Item</th>
                <th>Status</th><th>Aksi</th>
              </tr></thead>
              <tbody>
                {issues.map(r => (
                  <tr key={r.id} onClick={() => setDetailId(r.id)} style={{ cursor: 'pointer' }}>
                    <td><code style={{ fontSize: 11, color: '#8B5CF6' }}>{r.doc_number}</code></td>
                    <td className="text-secondary">{new Date(r.issue_date).toLocaleDateString('id-ID')}</td>
                    <td style={{ fontWeight: 500 }}>{r.warehouse_name}</td>
                    <td><span className="badge badge-neutral" style={{ fontSize: 10 }}>{TYPE_LABEL[r.issue_type] ?? r.issue_type}</span></td>
                    <td className="text-secondary">{r.customer_name || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{r.line_count} item</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {r.status === 'draft' && <>
                          <button className="btn btn-primary btn-sm" style={{ background: '#7C3AED', borderColor: '#7C3AED', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleConfirm(r.id, r.doc_number)}>
                            <IconCheck size={11} /> Konfirmasi
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(r.id)}>Batal</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination"><span>{issues.length} dokumen</span><span className="text-secondary text-xs">Klik baris untuk detail</span></div>
      </div>

      {/* ═══ MODAL: BUAT PENGELUARAN ═══ */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Buat Pengeluaran Barang</h2>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Isi detail barang — batch dipilih otomatis (FEFO) saat konfirmasi</p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><IconClose size={16} /></button>
            </div>
            <div className="modal-body" style={{ gap: 20 }}>
              {/* Header */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', padding: '16px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>Informasi Dokumen</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Gudang Asal *</label>
                    <select className="form-input" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} required>
                      <option value="">— Pilih Gudang —</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Pengeluaran *</label>
                    <input className="form-input" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jenis Pengeluaran *</label>
                    <select className="form-input" value={form.issue_type} onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}>
                      {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pelanggan / Tujuan</label>
                    <input className="form-input" placeholder="PT. Pelanggan Jaya" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Catatan</label>
                    <input className="form-input" placeholder="Opsional..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Lines */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    Detail Barang ({lines.length} baris)
                  </p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLine} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <IconPlus size={12} /> Tambah Baris
                  </button>
                </div>

                {/* FEFO note */}
                <div style={{ padding: '8px 12px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <IconInfo size={12} color="#8B5CF6" />
                  Cukup isi barang dan qty. Sistem akan pilih batch (FEFO) saat tombol Konfirmasi diklik.
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 100px 30px', gap: 8, padding: '8px 14px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <span>Barang</span><span>Qty Keluar</span><span></span>
                  </div>
                  {lines.map((line, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 100px 30px', gap: 8, padding: '10px 14px', borderBottom: idx < lines.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                      <ItemSelector value={line.item_id} onChange={item => {
                        if (item) { updateLine(idx, 'item_id', item.id); updateLine(idx, 'item_name', item.name); updateLine(idx, 'unit_symbol', item.unit_symbol); }
                        else { setLines(ls => ls.map((l, i) => i === idx ? newLine() : l)); }
                      }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input className="form-input" type="number" min="0.01" step="1" placeholder="1"
                          value={line.qty_requested} onChange={e => updateLine(idx, 'qty_requested', e.target.value)} />
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{line.unit_symbol}</span>
                      </div>
                      <button type="button" onClick={() => lines.length > 1 && removeLine(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: lines.length > 1 ? 'pointer' : 'not-allowed', opacity: lines.length > 1 ? 1 : 0.3, display: 'flex', alignItems: 'center' }}>
                        <IconClose size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Batal</button>
              <button type="button" className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconIssue size={13} />} Simpan Draft
              </button>
              <button type="button" className="btn btn-primary" style={{ background: '#7C3AED', borderColor: '#7C3AED', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleSave(true)} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={14} />} Konfirmasi & Kurangi Stok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: DETAIL ═══ */}
      {detailId && detail && (
        <div className="modal-overlay" onClick={() => setDetailId(null)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{detail.doc_number}</h2>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <span className={`badge ${STATUS_BADGE[detail.status]}`}>{STATUS_LABEL[detail.status]}</span>
                  <span className="badge badge-neutral">{TYPE_LABEL[detail.issue_type]}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetailId(null)}><IconClose size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 'var(--text-sm)' }}>
                {[['Gudang', detail.warehouse_name], ['Tanggal', new Date(detail.issue_date).toLocaleDateString('id-ID')], ['Pelanggan', detail.customer_name || '—'], ['Diproses oleh', detail.issued_by_name], ['Catatan', detail.notes || '—']].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                <table className="data-table">
                  <thead><tr><th>Barang</th><th>Qty Diminta</th><th>Qty Dikeluarkan</th><th>Batch (FEFO)</th></tr></thead>
                  <tbody>
                    {detail.lines?.map((l, i) => (
                      <tr key={i}>
                        <td><div style={{ fontWeight: 500 }}>{l.item_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.sku}</div></td>
                        <td>{l.qty_requested} {l.unit_symbol}</td>
                        <td style={{ fontWeight: 500, color: 'var(--success)' }}>{l.qty_issued ?? '—'} {l.unit_symbol}</td>
                        <td>
                          {l.batch_details?.map((b, bi) => (
                            <div key={bi} style={{ fontSize: 11 }}>
                              <code style={{ color: 'var(--primary)' }}>{b.batch_number}</code>
                              <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>× {b.qty_issued}</span>
                            </div>
                          )) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              {detail.status === 'draft' && (
                <button className="btn btn-primary" style={{ background: '#7C3AED', borderColor: '#7C3AED', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => handleConfirm(detail.id, detail.doc_number)}>
                  <IconCheck size={13} /> Konfirmasi & Terapkan FEFO
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
