/**
 * ItemSelector — Searchable dropdown untuk pilih item
 * Dipakai di form Penerimaan, Pengeluaran, Transfer
 */
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { itemsApi } from '@/services/api';
import { IconSearch, IconPackage } from '@/components/ui/Icons';

interface Item { id: string; name: string; sku: string; unit_symbol: string; cost_price: number; }

interface Props {
  value: string;         // item_id yang dipilih
  onChange: (item: Item | null) => void;
  placeholder?: string;
}

export default function ItemSelector({ value, onChange, placeholder = 'Cari atau pilih barang...' }: Props) {
  const [items,       setItems]       = useState<Item[]>([]);
  const [search,      setSearch]      = useState('');
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef                       = useRef<HTMLDivElement>(null);
  const inputRef                      = useRef<HTMLInputElement>(null);
  const listRef                       = useRef<HTMLDivElement>(null);

  const selected = items.find(i => i.id === value) ?? (value ? { id: value, name: '...', sku: '', unit_symbol: '', cost_price: 0 } : null);

  // ── Fetch with debounce ─────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await itemsApi.getAll({ search, limit: 30 });
        setItems(res.data.data);
        setHighlighted(-1);
      } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [search, open]);

  // ── Close on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Auto-focus search when opened ──────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const handleSelect = (item: Item) => {
    onChange(item);
    setSearch('');
    setOpen(false);
    setHighlighted(-1);
  };

  const handleClear = () => { onChange(null); setSearch(''); setItems([]); };

  // ── Keyboard navigation ─────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      handleSelect(items[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, highlighted]);

  // ── Scroll highlighted item into view ──────────────────────
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.children[highlighted] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }} onKeyDown={handleKeyDown}>

      {/* ── Trigger Button ───────────────────────────────────── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 10px',
          background: 'var(--bg-elevated)',
          border: `1px solid ${open ? 'var(--primary)' : 'var(--border-bright)'}`,
          borderRadius: 'var(--r-sm)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: open ? '0 0 0 3px var(--primary-glow)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          minHeight: 38,
        }}
      >
        {selected && value ? (
          <>
            <IconPackage size={13} color="var(--icon-primary)" />
            <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              <strong>{selected.name}</strong>
              {selected.sku && (
                <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 'var(--text-xs)' }}>
                  {selected.sku}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleClear(); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
            >×</button>
          </>
        ) : (
          <>
            <IconSearch size={12} color="var(--icon-muted)" />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{placeholder}</span>
          </>
        )}
      </div>

      {/* ── Dropdown Panel ───────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          // Breakout: min 400px, max 560px; clamp to viewport right edge
          minWidth: 400,
          maxWidth: 560,
          width: 'max-content',
          zIndex: 9999,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-bright)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'modal-in 0.12s ease',
        }}>

          {/* Search input */}
          <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <div className="search-bar" style={{ width: '100%' }}>
              <IconSearch size={13} color="var(--icon-muted)" />
              <input
                ref={inputRef}
                placeholder="Ketik nama atau SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 'var(--text-sm)', width: '100%' }}
              />
            </div>
          </div>

          {/* Results header */}
          {!loading && items.length > 0 && (
            <div style={{ padding: '6px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>
              {items.length} barang ditemukan
            </div>
          )}

          {/* List */}
          <div ref={listRef} style={{ maxHeight: 320, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                {search ? `Tidak ada hasil untuk "${search}"` : 'Ketik untuk mencari barang...'}
              </div>
            ) : items.map((item, idx) => {
              const isHighlighted = idx === highlighted;
              const isSelected    = item.id === value;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid var(--border)',
                    background: isHighlighted
                      ? 'var(--bg-hover)'
                      : isSelected
                      ? 'rgba(59,130,246,0.08)'
                      : 'transparent',
                    transition: 'background 0.08s',
                  }}
                  onMouseEnter={() => setHighlighted(idx)}
                  onMouseLeave={() => setHighlighted(-1)}
                >
                  {/* Item icon */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: isSelected ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.1)',
                    border: isSelected ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <IconPackage size={15} color="var(--icon-primary)" />
                  </div>

                  {/* Name + detail */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 'var(--text-sm)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 1, display: 'flex', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>{item.sku}</span>
                      <span>•</span>
                      <span>{item.unit_symbol}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--success)', fontWeight: 500 }}>Rp {fmt(item.cost_price)}</span>
                    </div>
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div style={{ padding: '6px 14px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
            <span>↑↓ navigasi</span>
            <span>↵ pilih</span>
            <span>Esc tutup</span>
          </div>
        </div>
      )}
    </div>
  );
}
