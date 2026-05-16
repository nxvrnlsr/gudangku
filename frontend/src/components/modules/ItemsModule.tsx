'use client';
import { useEffect, useState, useCallback } from 'react';
import { itemsApi } from '@/services/api';
import { IconPackage, IconSearch, IconPlus, IconClose, IconEdit, IconDelete } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

interface Item {
  id: string; name: string; sku: string; barcode: string;
  category_name: string; base_unit_id: string; unit_symbol: string;
  cost_price: number; min_stock_qty: number; shelf_life_days: number | null;
  category_id: string | null; is_active: boolean;
}
type FormState = {
  name: string; sku: string; barcode: string; category_id: string;
  base_unit_id: string; shelf_life_days: string; min_stock_qty: string;
  cost_price: string; is_active: boolean;
};

const BLANK: FormState = {
  name: '', sku: '', barcode: '', category_id: '', base_unit_id: '',
  shelf_life_days: '', min_stock_qty: '0', cost_price: '0', is_active: true,
};

const fmtCurrency = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export default function ItemsModule() {
  const [items, setItems]             = useState<Item[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState({ total: 0, total_pages: 1 });
  const [categories, setCategories]   = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits]             = useState<{ id: string; name: string; symbol: string }[]>([]);

  // ── Modal state ──────────────────────────────────────────
  const [modalMode, setModalMode]     = useState<'create' | 'edit' | null>(null);
  const [form, setForm]               = useState<FormState>(BLANK);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting]       = useState(false);

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

  /* ── Open Create ─────────────────────────────────────── */
  const openCreate = () => { setForm(BLANK); setEditingId(null); setModalMode('create'); };

  /* ── Open Edit ───────────────────────────────────────── */
  const openEdit = (item: Item) => {
    setForm({
      name:            item.name,
      sku:             item.sku,
      barcode:         item.barcode || '',
      category_id:     item.category_id || '',
      base_unit_id:    item.base_unit_id,
      shelf_life_days: item.shelf_life_days != null ? String(item.shelf_life_days) : '',
      min_stock_qty:   String(item.min_stock_qty),
      cost_price:      String(item.cost_price),
      is_active:       item.is_active,
    });
    setEditingId(item.id);
    setModalMode('edit');
  };

  /* ── Save (create or edit) ───────────────────────────── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        shelf_life_days: form.shelf_life_days ? parseInt(form.shelf_life_days) : null,
        min_stock_qty: parseFloat(form.min_stock_qty),
        cost_price:    parseFloat(form.cost_price),
      };
      if (modalMode === 'create') {
        await itemsApi.create(payload);
        toast.success('Barang berhasil ditambahkan!');
      } else if (editingId) {
        await itemsApi.update(editingId, payload);
        toast.success('Barang berhasil diperbarui!');
      }
      setModalMode(null);
      fetchItems();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  /* ── Quick toggle status ─────────────────────────────── */
  const toggleStatus = async (item: Item) => {
    try {
      await itemsApi.update(item.id, { is_active: !item.is_active });
      toast.success(`${item.name} → ${!item.is_active ? 'Aktif' : 'Nonaktif'}`);
      fetchItems();
    } catch { toast.error('Gagal mengubah status'); }
  };

  /* ── Delete ──────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await itemsApi.delete(deleteTarget.id);
      toast.success(res.data.message);
      setDeleteTarget(null);
      fetchItems();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus');
    } finally { setDeleting(false); }
  };

  const closeModal = () => { setModalMode(null); setEditingId(null); };

  /* ────────────────────────────────────────────────────── */
  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconPackage size={20} color="var(--icon-primary)" /> Master Barang
        </h1>
        <div className="filter-bar">
          <div className="search-bar">
            <IconSearch size={14} color="var(--icon-muted)" />
            <input placeholder="Cari nama, SKU, barcode..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconPlus size={14} /> Tambah Barang
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : items.length === 0 ? (
            <div className="empty-state"><IconPackage size={40} color="var(--icon-muted)" /><p>Tidak ada barang</p></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>SKU</th><th>Nama Barang</th><th>Kategori</th><th>Satuan</th>
                <th>Shelf Life</th><th>Stok Min</th><th>HPP</th><th>Status</th><th>Aksi</th>
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
                    <td>
                      {/* Clickable status badge = quick toggle */}
                      <button
                        onClick={() => toggleStatus(item)}
                        title="Klik untuk ubah status"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {item.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit barang"
                          onClick={() => openEdit(item)}
                          style={{ padding: '4px 6px' }}
                        >
                          <IconEdit size={13} color="var(--icon-primary)" />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Hapus barang"
                          onClick={() => setDeleteTarget(item)}
                          style={{ padding: '4px 6px' }}
                        >
                          <IconDelete size={13} color="var(--error)" />
                        </button>
                      </div>
                    </td>
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

      {/* ══ MODAL: TAMBAH / EDIT BARANG ════════════════════════ */}
      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === 'create' ? '➕ Tambah Barang Baru' : `✏️ Edit Barang`}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}><IconClose size={16} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                  {/* Nama */}
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Nama Barang *</label>
                    <input className="form-input" value={form.name} required placeholder="Beras Pandan Wangi 5kg"
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>

                  {/* SKU */}
                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input className="form-input" value={form.sku} required placeholder="BRS-001"
                      onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                  </div>

                  {/* Barcode */}
                  <div className="form-group">
                    <label className="form-label">Barcode</label>
                    <input className="form-input" value={form.barcode} placeholder="8991100001111"
                      onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
                  </div>

                  {/* Kategori */}
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select className="form-input" value={form.category_id}
                      onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                      <option value="">-- Pilih Kategori --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Satuan */}
                  <div className="form-group">
                    <label className="form-label">Satuan Dasar *</label>
                    <select className="form-input" value={form.base_unit_id} required
                      onChange={e => setForm(f => ({ ...f, base_unit_id: e.target.value }))}>
                      <option value="">-- Pilih Satuan --</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                    </select>
                  </div>

                  {/* Shelf Life */}
                  <div className="form-group">
                    <label className="form-label">Shelf Life (Hari)</label>
                    <input className="form-input" type="number" min="0" step="1" placeholder="365"
                      value={form.shelf_life_days}
                      onChange={e => setForm(f => ({ ...f, shelf_life_days: e.target.value }))} />
                  </div>

                  {/* Stok Min */}
                  <div className="form-group">
                    <label className="form-label">Stok Minimum</label>
                    <input className="form-input" type="number" min="0" step="1" value={form.min_stock_qty}
                      onChange={e => setForm(f => ({ ...f, min_stock_qty: e.target.value }))} />
                  </div>

                  {/* HPP */}
                  <div className="form-group">
                    <label className="form-label">HPP Awal (Rp)</label>
                    <input className="form-input" type="number" min="0" step="1000" value={form.cost_price}
                      onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} />
                  </div>

                  {/* Status — hanya tampil saat edit */}
                  {modalMode === 'edit' && (
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-input" value={form.is_active ? 'true' : 'false'}
                        onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                        <option value="true">✅ Aktif</option>
                        <option value="false">🔴 Nonaktif</option>
                      </select>
                    </div>
                  )}

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Menyimpan...</>
                    : modalMode === 'create' ? 'Simpan Barang' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL: KONFIRMASI HAPUS ═════════════════════════════ */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--error)' }}>🗑️ Hapus Barang</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteTarget(null)}><IconClose size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>
                Anda akan menghapus barang berikut secara permanen:
              </p>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', padding: '12px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{deleteTarget.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{deleteTarget.sku}</div>
              </div>
              <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                ⚠️ Barang dengan stok aktif tidak bisa dihapus.<br />
                Gunakan <strong>Edit → Status: Nonaktif</strong> untuk menonaktifkan barang yang masih memiliki stok.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleDelete} disabled={deleting}
                style={{ background: 'var(--error)', borderColor: 'var(--error)' }}>
                {deleting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Menghapus...</> : '🗑️ Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
