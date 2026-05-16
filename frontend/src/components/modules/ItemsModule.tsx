'use client';
import { useEffect, useState, useCallback } from 'react';
import { itemsApi } from '@/services/api';
import { IconPackage, IconSearch, IconPlus, IconClose } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

interface Item { id: string; name: string; sku: string; barcode: string; category_name: string; unit_symbol: string; cost_price: number; min_stock_qty: number; is_active: boolean; }

const fmtCurrency = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export default function ItemsModule() {
  const [items, setItems]         = useState<Item[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits]         = useState<{ id: string; name: string; symbol: string }[]>([]);
  const [form, setForm]           = useState({ name: '', sku: '', barcode: '', category_id: '', base_unit_id: '', shelf_life_days: '', min_stock_qty: '0', cost_price: '0' });
  const [saving, setSaving]       = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await itemsApi.getAll({ search, page, limit: 20 });
      setItems(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Gagal memuat data barang'); } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => {
    itemsApi.getCategories().then(r => setCategories(r.data.data));
    itemsApi.getUnits().then(r => setUnits(r.data.data));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await itemsApi.create({ ...form, shelf_life_days: form.shelf_life_days || null, min_stock_qty: parseFloat(form.min_stock_qty), cost_price: parseFloat(form.cost_price) });
      toast.success('Barang berhasil ditambahkan!');
      setShowModal(false);
      setForm({ name: '', sku: '', barcode: '', category_id: '', base_unit_id: '', shelf_life_days: '', min_stock_qty: '0', cost_price: '0' });
      fetchItems();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconPackage size={20} color="var(--primary)" /> Master Barang
        </h1>
        <div className="filter-bar">
          <div className="search-bar">
            <IconSearch size={14} color="var(--text-muted)" />
            <input placeholder="Cari nama, SKU, barcode..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={14} /> Tambah Barang</button>
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : items.length === 0 ? (
            <div className="empty-state"><IconPackage size={40} color="var(--text-muted)" /><p>Tidak ada barang</p></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>SKU</th><th>Nama Barang</th><th>Kategori</th><th>Satuan</th>
                <th>Shelf Life</th><th>Stok Min</th><th>HPP</th><th>Status</th>
              </tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td><code style={{ fontSize: 11, color: 'var(--primary)' }}>{item.sku}</code></td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td className="text-secondary">{item.category_name ?? '—'}</td>
                    <td><span className="badge badge-neutral">{item.unit_symbol}</span></td>
                    <td className="text-secondary">{item.shelf_life_days ? item.shelf_life_days + ' hari' : '—'}</td>
                    <td className="text-secondary">{item.min_stock_qty}</td>
                    <td style={{ fontWeight: 500 }}>{fmtCurrency(item.cost_price)}</td>
                    <td><span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>{item.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Pagination */}
        <div className="pagination">
          <span>{pagination.total} barang</span>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ lineHeight: '28px', fontSize: 'var(--text-xs)' }}>Hal. {page} / {pagination.total_pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </div>

      {/* Modal Tambah Barang */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Tambah Barang Baru</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><IconClose size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Nama Barang *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="Beras Pandan Wangi 5kg" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input className="form-input" value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} required placeholder="BRS-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Barcode</label>
                    <input className="form-input" value={form.barcode} onChange={e => setForm(f => ({...f, barcode: e.target.value}))} placeholder="8991100001111" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select className="form-input" value={form.category_id} onChange={e => setForm(f => ({...f, category_id: e.target.value}))}>
                      <option value="">-- Pilih Kategori --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Satuan Dasar *</label>
                    <select className="form-input" value={form.base_unit_id} onChange={e => setForm(f => ({...f, base_unit_id: e.target.value}))} required>
                      <option value="">-- Pilih Satuan --</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shelf Life (Hari)</label>
                    <input className="form-input" type="number" value={form.shelf_life_days} onChange={e => setForm(f => ({...f, shelf_life_days: e.target.value}))} placeholder="365" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stok Minimum</label>
                    <input className="form-input" type="number" value={form.min_stock_qty} onChange={e => setForm(f => ({...f, min_stock_qty: e.target.value}))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">HPP Awal (Rp)</label>
                    <input className="form-input" type="number" value={form.cost_price} onChange={e => setForm(f => ({...f, cost_price: e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" style={{width:14,height:14}} /> Menyimpan...</> : 'Simpan Barang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
