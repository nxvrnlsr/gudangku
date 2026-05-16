/**
 * ItemSelector — Searchable dropdown untuk pilih item
 * Dipakai di form Penerimaan, Pengeluaran, Transfer
 */
'use client';
import { useEffect, useState, useRef } from 'react';
import { itemsApi } from '@/services/api';
import { IconSearch, IconPackage } from '@/components/ui/Icons';

interface Item { id: string; name: string; sku: string; unit_symbol: string; cost_price: number; }

interface Props {
  value: string;         // item_id yang dipilih
  onChange: (item: Item | null) => void;
  placeholder?: string;
}

export default function ItemSelector({ value, onChange, placeholder = 'Cari atau pilih barang...' }: Props) {
  const [items,   setItems]   = useState<Item[]>([]);
  const [search,  setSearch]  = useState('');
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef               = useRef<HTMLDivElement>(null);

  const selected = items.find(i => i.id === value);

  // Fetch items saat search berubah
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await itemsApi.getAll({ search, limit: 20 });
        setItems(res.data.data);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search, open]);

  // Tutup dropdown saat klik luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item: Item) => {
    onChange(item);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => { onChange(null); setSearch(''); };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 12px',
          background: 'var(--bg-elevated)',
          border: `1px solid ${open ? 'var(--primary)' : 'var(--border-bright)'}`,
          borderRadius: 'var(--r-sm)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: open ? '0 0 0 3px var(--primary-glow)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          minHeight: 38,
        }}
      >
        {selected ? (
          <>
            <IconPackage size={13} color="var(--primary)" />
            <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
              <strong>{selected.name}</strong>
              <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 'var(--text-xs)' }}>
                {selected.sku} • {selected.unit_symbol}
              </span>
            </span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleClear(); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
            >×</button>
          </>
        ) : (
          <>
            <IconSearch size={13} color="var(--text-muted)" />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{placeholder}</span>
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
          borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}>
          {/* Search input dalam dropdown */}
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <div className="search-bar" style={{ width: '100%' }}>
              <IconSearch size={13} color="var(--text-muted)" />
              <input
                autoFocus
                placeholder="Ketik nama atau SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 'var(--text-sm)' }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 16, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : items.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                Tidak ada barang ditemukan
              </div>
            ) : items.map(item => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s',
                  background: item.id === value ? 'var(--bg-active)' : 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = item.id === value ? 'var(--bg-active)' : 'transparent')}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconPackage size={13} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {item.sku} • {item.unit_symbol} • Rp {new Intl.NumberFormat('id-ID').format(item.cost_price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
