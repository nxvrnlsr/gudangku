'use client';
import { useEffect, useState, useCallback } from 'react';
import { warehousesApi } from '@/services/api';
import { IconPlus, IconClose, IconCheck, IconWarehouse } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────
interface City     { id: string; name: string; code: string; }
interface Region   { id: string; name: string; code: string; cities: City[]; }
interface Warehouse {
  id: string; name: string; code: string; address: string | null;
  pic_name: string | null; pic_phone: string | null;
  is_active: boolean; city_id: string;
  city_name: string; region_name: string;
}

// ── Small inline icons ─────────────────────────────────────────
const IconEdit = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);
const IconMapPin = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconCity = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="9" width="13" height="13"/><path d="M8 22V12h5v10"/>
    <path d="M21 22V6l-5-4v20"/><path d="M3 9l9-7 9 7"/>
  </svg>
);

// ── Modal wrapper ──────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
        borderRadius: 'var(--r-lg)', padding: 28, width: 460,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><IconClose size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Pill tab ───────────────────────────────────────────────────
type SubTab = 'provinces' | 'cities' | 'warehouses';

// ══════════════════════════════════════════════════════════════
export default function LocationManagementTab() {
  const [subTab, setSubTab] = useState<SubTab>('provinces');

  // ── Data ──────────────────────────────────────────────────
  const [regions,    setRegions]    = useState<Region[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading,    setLoading]    = useState(false);

  // Flat city list derived from regions
  const allCities = regions.flatMap(r => r.cities.map(c => ({ ...c, region_name: r.name, region_id: r.id })));

  const loadRegions = useCallback(async () => {
    setLoading(true);
    try {
      const r = await warehousesApi.getRegions();
      setRegions(r.data.data);
    } catch { toast.error('Gagal memuat data provinsi.'); }
    finally { setLoading(false); }
  }, []);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await warehousesApi.getAll();
      setWarehouses(r.data.data);
    } catch { toast.error('Gagal memuat data gudang.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadRegions();
    loadWarehouses();
  }, [loadRegions, loadWarehouses]);

  // ── Modal state ───────────────────────────────────────────
  const EMPTY_REGION    = { id: '', name: '', code: '' };
  const EMPTY_CITY      = { id: '', name: '', code: '', region_id: '' };
  const EMPTY_WH        = { id: '', name: '', code: '', city_id: '', address: '', pic_name: '', pic_phone: '' };

  const [regionModal, setRegionModal] = useState<{ open: boolean; data: typeof EMPTY_REGION }>({ open: false, data: EMPTY_REGION });
  const [cityModal,   setCityModal]   = useState<{ open: boolean; data: typeof EMPTY_CITY   }>({ open: false, data: EMPTY_CITY });
  const [whModal,     setWhModal]     = useState<{ open: boolean; data: typeof EMPTY_WH     }>({ open: false, data: EMPTY_WH });
  const [saving, setSaving] = useState(false);

  // ── Region handlers ────────────────────────────────────────
  const saveRegion = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const { id, ...body } = regionModal.data;
      if (id) { await warehousesApi.updateRegion(id, body); toast.success('Provinsi diperbarui.'); }
      else     { await warehousesApi.createRegion(body);     toast.success('Provinsi ditambahkan.'); }
      setRegionModal({ open: false, data: EMPTY_REGION });
      loadRegions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal menyimpan provinsi.');
    } finally { setSaving(false); }
  };

  const deleteRegion = async (id: string, name: string) => {
    if (!confirm(`Hapus provinsi "${name}"?`)) return;
    try {
      await warehousesApi.deleteRegion(id);
      toast.success('Provinsi dihapus.');
      loadRegions();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Gagal menghapus.'); }
  };

  // ── City handlers ──────────────────────────────────────────
  const saveCity = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const { id, ...body } = cityModal.data;
      if (id) { await warehousesApi.updateCity(id, body); toast.success('Kota diperbarui.'); }
      else     { await warehousesApi.createCity(body);     toast.success('Kota ditambahkan.'); }
      setCityModal({ open: false, data: EMPTY_CITY });
      loadRegions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal menyimpan kota.');
    } finally { setSaving(false); }
  };

  const deleteCity = async (id: string, name: string) => {
    if (!confirm(`Hapus kota "${name}"?`)) return;
    try {
      await warehousesApi.deleteCity(id);
      toast.success('Kota dihapus.');
      loadRegions();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Gagal menghapus.'); }
  };

  // ── Warehouse handlers ─────────────────────────────────────
  const saveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const { id, ...body } = whModal.data;
      if (id) { await warehousesApi.update(id, body); toast.success('Gudang diperbarui.'); }
      else     { await warehousesApi.create(body);     toast.success('Gudang ditambahkan.'); }
      setWhModal({ open: false, data: EMPTY_WH });
      loadWarehouses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Gagal menyimpan gudang.');
    } finally { setSaving(false); }
  };

  const deleteWarehouse = async (id: string, name: string) => {
    if (!confirm(`Hapus gudang "${name}"? Pastikan tidak ada stok aktif.`)) return;
    try {
      await warehousesApi.delete(id);
      toast.success('Gudang dihapus.');
      loadWarehouses();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Gagal menghapus.'); }
  };

  const toggleWarehouse = async (wh: Warehouse) => {
    try {
      await warehousesApi.update(wh.id, { is_active: !wh.is_active });
      toast.success(wh.is_active ? 'Gudang dinonaktifkan.' : 'Gudang diaktifkan.');
      loadWarehouses();
    } catch { toast.error('Gagal memperbarui status.'); }
  };

  const SUBTABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'provinces', label: `Provinsi (${regions.length})`,      icon: <IconMapPin /> },
    { id: 'cities',    label: `Kota/Kab (${allCities.length})`,    icon: <IconCity /> },
    { id: 'warehouses',label: `Gudang (${warehouses.length})`,     icon: <IconWarehouse size={15} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflow: 'hidden' }}>

      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {SUBTABS.map(t => (
            <button key={t.id}
              className={`btn ${subTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSubTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Add button */}
        {subTab === 'provinces' && (
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setRegionModal({ open: true, data: EMPTY_REGION })}>
            <IconPlus size={14} /> Tambah Provinsi
          </button>
        )}
        {subTab === 'cities' && (
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setCityModal({ open: true, data: EMPTY_CITY })}>
            <IconPlus size={14} /> Tambah Kota
          </button>
        )}
        {subTab === 'warehouses' && (
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setWhModal({ open: true, data: EMPTY_WH })}>
            <IconPlus size={14} /> Tambah Gudang
          </button>
        )}
      </div>

      {/* Content panel */}
      <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (

          // ── PROVINCES ──────────────────────────────────────
          subTab === 'provinces' ? (
            <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead><tr>
                  <th>Kode</th><th>Nama Provinsi</th><th>Jumlah Kota/Kab</th><th>Aksi</th>
                </tr></thead>
                <tbody>
                  {regions.map(r => (
                    <tr key={r.id}>
                      <td><code style={{ fontSize: 11, color: 'var(--primary)' }}>{r.code}</code></td>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td>{r.cities.length} kota/kabupaten</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                            onClick={() => setRegionModal({ open: true, data: { id: r.id, name: r.name, code: r.code } })}>
                            <IconEdit /> Edit
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--danger)' }}
                            onClick={() => deleteRegion(r.id, r.name)}>
                            <IconTrash /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          // ── CITIES ────────────────────────────────────────
          ) : subTab === 'cities' ? (
            <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead><tr>
                  <th>Kode</th><th>Nama Kota/Kab</th><th>Provinsi</th><th>Aksi</th>
                </tr></thead>
                <tbody>
                  {allCities.map(c => (
                    <tr key={c.id}>
                      <td><code style={{ fontSize: 11, color: 'var(--primary)' }}>{c.code}</code></td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td className="text-secondary text-sm">{(c as any).region_name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                            onClick={() => setCityModal({ open: true, data: { id: c.id, name: c.name, code: c.code, region_id: (c as any).region_id } })}>
                            <IconEdit /> Edit
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--danger)' }}
                            onClick={() => deleteCity(c.id, c.name)}>
                            <IconTrash /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          // ── WAREHOUSES ────────────────────────────────────
          ) : (
            <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
              <table className="data-table">
                <thead><tr>
                  <th>Kode</th><th>Nama Gudang</th><th>Kota</th><th>Provinsi</th>
                  <th>PIC</th><th>Status</th><th>Aksi</th>
                </tr></thead>
                <tbody>
                  {warehouses.map(w => (
                    <tr key={w.id}>
                      <td><code style={{ fontSize: 11, color: 'var(--primary)' }}>{w.code}</code></td>
                      <td style={{ fontWeight: 500 }}>{w.name}</td>
                      <td className="text-sm">{w.city_name}</td>
                      <td className="text-secondary text-sm">{w.region_name}</td>
                      <td className="text-sm">{w.pic_name || <span className="text-muted">—</span>}</td>
                      <td>
                        <span className={`badge ${w.is_active ? 'badge-success' : 'badge-neutral'}`}>
                          {w.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                            onClick={() => setWhModal({ open: true, data: {
                              id: w.id, name: w.name, code: w.code, city_id: w.city_id,
                              address: w.address || '', pic_name: w.pic_name || '', pic_phone: w.pic_phone || '',
                            }})}>
                            <IconEdit /> Edit
                          </button>
                          <button className="btn btn-ghost btn-sm"
                            style={{ color: w.is_active ? 'var(--text-muted)' : 'var(--success)' }}
                            onClick={() => toggleWarehouse(w)}>
                            {w.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--danger)' }}
                            onClick={() => deleteWarehouse(w.id, w.name)}>
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── MODAL: Province ──────────────────────────────── */}
      {regionModal.open && (
        <Modal title={regionModal.data.id ? 'Edit Provinsi' : 'Tambah Provinsi'}
               onClose={() => setRegionModal({ open: false, data: EMPTY_REGION })}>
          <form onSubmit={saveRegion} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nama Provinsi *</label>
              <input className="form-input" required placeholder="cth: Jawa Barat"
                value={regionModal.data.name}
                onChange={e => setRegionModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kode <span className="text-muted" style={{ fontWeight: 400 }}>(maks 10 karakter)</span></label>
              <input className="form-input" maxLength={10} placeholder="cth: JB"
                value={regionModal.data.code}
                onChange={e => setRegionModal(m => ({ ...m, data: { ...m.data, code: e.target.value.toUpperCase() } }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary"
                onClick={() => setRegionModal({ open: false, data: EMPTY_REGION })}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={14} />}
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: City ──────────────────────────────────── */}
      {cityModal.open && (
        <Modal title={cityModal.data.id ? 'Edit Kota/Kabupaten' : 'Tambah Kota/Kabupaten'}
               onClose={() => setCityModal({ open: false, data: EMPTY_CITY })}>
          <form onSubmit={saveCity} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Provinsi *</label>
              <select className="form-input" required
                value={cityModal.data.region_id}
                onChange={e => setCityModal(m => ({ ...m, data: { ...m.data, region_id: e.target.value } }))}>
                <option value="">— Pilih Provinsi —</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Kota/Kabupaten *</label>
              <input className="form-input" required placeholder="cth: Bandung"
                value={cityModal.data.name}
                onChange={e => setCityModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kode <span className="text-muted" style={{ fontWeight: 400 }}>(maks 10 karakter)</span></label>
              <input className="form-input" maxLength={10} placeholder="cth: BDG"
                value={cityModal.data.code}
                onChange={e => setCityModal(m => ({ ...m, data: { ...m.data, code: e.target.value.toUpperCase() } }))} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary"
                onClick={() => setCityModal({ open: false, data: EMPTY_CITY })}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={14} />}
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: Warehouse ─────────────────────────────── */}
      {whModal.open && (
        <Modal title={whModal.data.id ? 'Edit Gudang' : 'Tambah Gudang Baru'}
               onClose={() => setWhModal({ open: false, data: EMPTY_WH })}>
          <form onSubmit={saveWarehouse} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Kota/Kabupaten *</label>
              <select className="form-input" required
                value={whModal.data.city_id}
                onChange={e => setWhModal(m => ({ ...m, data: { ...m.data, city_id: e.target.value } }))}>
                <option value="">— Pilih Kota —</option>
                {regions.map(r => (
                  <optgroup key={r.id} label={r.name}>
                    {r.cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Gudang *</label>
              <input className="form-input" required placeholder="cth: Gudang Jakarta Selatan"
                value={whModal.data.name}
                onChange={e => setWhModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kode Gudang <span className="text-muted" style={{ fontWeight: 400 }}>(opsional, auto-generate)</span></label>
              <input className="form-input" maxLength={20} placeholder="cth: GDG-JKS-001"
                value={whModal.data.code}
                onChange={e => setWhModal(m => ({ ...m, data: { ...m.data, code: e.target.value.toUpperCase() } }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Alamat</label>
              <input className="form-input" placeholder="Jl. Raya..."
                value={whModal.data.address}
                onChange={e => setWhModal(m => ({ ...m, data: { ...m.data, address: e.target.value } }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nama PIC</label>
                <input className="form-input" placeholder="Nama penanggung jawab"
                  value={whModal.data.pic_name}
                  onChange={e => setWhModal(m => ({ ...m, data: { ...m.data, pic_name: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label className="form-label">No. Telp PIC</label>
                <input className="form-input" placeholder="08xx-xxxx-xxxx"
                  value={whModal.data.pic_phone}
                  onChange={e => setWhModal(m => ({ ...m, data: { ...m.data, pic_phone: e.target.value } }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" className="btn btn-secondary"
                onClick={() => setWhModal({ open: false, data: EMPTY_WH })}>Batal</button>
              <button type="submit" className="btn btn-primary" disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={14} />}
                Simpan Gudang
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
