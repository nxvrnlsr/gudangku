'use client';
import { useT } from '@/hooks/useT';
import { useEffect, useState, useCallback } from 'react';
import { warehousesApi } from '@/services/api';
import { IconWarehouse, IconSearch } from '@/components/ui/Icons';
import toast from 'react-hot-toast';

interface StockItem { item_id: string; item_name: string; sku: string; unit_symbol: string; qty_on_hand: number; qty_available: number; avg_cost_price: number; stock_status: string; batch_count: number; expiry_status: string; }
interface Warehouse { id: string; name: string; city_name: string; region_name: string; is_active: boolean; }

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

export default function WarehousesModule() {
  const { t } = useT();
  const [warehouses, setWarehouses]     = useState<Warehouse[]>([]);
  const [selectedWh, setSelectedWh]    = useState<string>('');
  const [stock, setStock]              = useState<StockItem[]>([]);
  const [loadingWh, setLoadingWh]      = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [search, setSearch]            = useState('');

  const STATUS_STYLE: Record<string, string> = { normal: 'badge-success', minimum: 'badge-warning', stockout: 'badge-danger', overstock: 'badge-info' };
  const EXPIRY_STYLE: Record<string, string> = { safe: 'badge-success', warning: 'badge-warning', critical: 'badge-danger', expired: 'badge-danger', none: 'badge-neutral' };

  useEffect(() => {
    warehousesApi.getAll().then(r => {
      setWarehouses(r.data.data);
      if (r.data.data.length > 0) setSelectedWh(r.data.data[0].id);
      setLoadingWh(false);
    }).catch(() => { toast.error(t('warehouses.loadError')); setLoadingWh(false); });
  }, []);

  const fetchStock = useCallback(async () => {
    if (!selectedWh) return;
    setLoadingStock(true);
    try {
      const res = await warehousesApi.getStock(selectedWh);
      setStock(res.data.data);
    } catch { toast.error(t('warehouses.stockLoadError')); } finally { setLoadingStock(false); }
  }, [selectedWh]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const filtered = stock.filter(s => s.item_name?.toLowerCase().includes(search.toLowerCase()) || s.sku?.toLowerCase().includes(search.toLowerCase()));
  const selectedWarehouse = warehouses.find(w => w.id === selectedWh);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconWarehouse size={20} color="var(--icon-success)" /> Gudang & Posisi Stok
          </h1>
          {selectedWarehouse && <p className="text-secondary text-sm">{selectedWarehouse.name} — {selectedWarehouse.city_name}</p>}
        </div>
        <div className="filter-bar">
          <div className="search-bar">
            <IconSearch size={14} color="var(--icon-muted)" />
            <input placeholder="Cari barang..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Gudang Selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {loadingWh ? <div className="spinner" /> : warehouses.map(wh => (
          <button key={wh.id} className={`btn ${selectedWh === wh.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedWh(wh.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconWarehouse size={13} /> {wh.name}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
          {loadingStock ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><IconWarehouse size={40} color="var(--icon-muted)" /><p>Tidak ada stok di gudang ini</p></div>
          ) : (
            <table className="data-table">
              <thead><tr>
                <th>SKU</th><th>Nama Barang</th><th>Qty On Hand</th><th>Qty Available</th>
                <th>HPP Rata-Rata</th><th>Nilai Stok</th><th>Status Stok</th><th>Status Expiry</th>
              </tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.item_id}>
                    <td><code style={{ fontSize: 11, color: 'var(--primary)' }}>{s.sku}</code></td>
                    <td style={{ fontWeight: 500 }}>{s.item_name}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(s.qty_on_hand)} <span className="text-muted text-xs">{s.unit_symbol}</span></td>
                    <td>{fmt(s.qty_available)} <span className="text-muted text-xs">{s.unit_symbol}</span></td>
                    <td>Rp {fmt(s.avg_cost_price)}</td>
                    <td style={{ fontWeight: 500 }}>Rp {fmt(s.qty_on_hand * s.avg_cost_price)}</td>
                    <td><span className={`badge ${STATUS_STYLE[s.stock_status] ?? 'badge-neutral'}`}>{s.stock_status}</span></td>
                    <td><span className={`badge ${EXPIRY_STYLE[s.expiry_status] ?? 'badge-neutral'}`}>{s.expiry_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="pagination">
          <span>{filtered.length} item di gudang ini</span>
          <span className="text-secondary text-xs">Total Nilai: <strong style={{ color: 'var(--text-primary)' }}>Rp {fmt(filtered.reduce((s, i) => s + i.qty_on_hand * i.avg_cost_price, 0))}</strong></span>
        </div>
      </div>
    </div>
  );
}
