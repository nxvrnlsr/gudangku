'use client';
import { useState } from 'react';
import { reportsApi } from '@/services/api';
import toast from 'react-hot-toast';

interface StockRow { SKU: string; 'Nama Barang': string; Kategori: string; Satuan: string; Gudang: string; 'Qty On Hand': number; 'Nilai Stok (Rp)': number; Status: string; }
interface ExpiryRow { 'No. Batch': string; 'Nama Barang': string; SKU: string; Gudang: string; 'Qty Sisa': number; 'Tgl Kadaluarsa': string; 'Sisa Hari': number; Status: string; }

export default function ReportsModule() {
  const [activeReport, setActiveReport] = useState<'stock'|'expiry'|'card'>('stock');
  const [stockData,    setStockData]    = useState<StockRow[]>([]);
  const [expiryData,   setExpiryData]   = useState<ExpiryRow[]>([]);
  const [loading, setLoading]           = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [exportedPath, setExportedPath] = useState<string>('');
  const [expiryDays, setExpiryDays]     = useState(30);

  const fetchStockPosition = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.stockPosition();
      setStockData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); } finally { setLoading(false); }
  };

  const fetchExpiry = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.expiryReport({ days: expiryDays });
      setExpiryData(res.data.data);
    } catch { toast.error('Gagal memuat laporan'); } finally { setLoading(false); }
  };

  const handleExport = async (type: 'stock'|'expiry') => {
    setExporting(true);
    try {
      const res = type === 'stock'
        ? await reportsApi.stockPosition({ export: 'excel' })
        : await reportsApi.expiryReport({ export: 'excel', days: expiryDays });
      setExportedPath(res.data.export?.filePath ?? '');
      toast.success(`File disimpan!\n${res.data.export?.fileName}`);
    } catch { toast.error('Gagal export'); } finally { setExporting(false); }
  };

  const openFolder = async () => {
    try {
      await reportsApi.openFolder(exportedPath ? exportedPath.substring(0, exportedPath.lastIndexOf('\\')) : undefined);
      toast.success('Folder dibuka di Windows Explorer');
    } catch { toast.error('Gagal membuka folder'); }
  };

  const EXPIRY_STYLE: Record<string, string> = { EXPIRED: 'badge-danger', KRITIS: 'badge-warning', PERINGATAN: 'badge-info', AMAN: 'badge-success' };
  const STOCK_STYLE: Record<string, string> = { Normal: 'badge-success', Minimum: 'badge-warning', Stockout: 'badge-danger', Overstock: 'badge-info' };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">📊 Laporan</h1>
        {exportedPath && (
          <button className="btn btn-secondary btn-sm" onClick={openFolder}>
            📁 Buka Folder Export
          </button>
        )}
      </div>

      {/* Report Type Selector */}
      <div className="flex gap-2" style={{ flexShrink: 0 }}>
        {[
          { key: 'stock',  label: '📦 Posisi Stok' },
          { key: 'expiry', label: '📅 Laporan Expiry' },
          { key: 'card',   label: '📜 Kartu Stok' },
        ].map(r => (
          <button key={r.key} className={`btn ${activeReport === r.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveReport(r.key as typeof activeReport)}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Stock Position */}
      {activeReport === 'stock' && (
        <>
          <div className="flex gap-3" style={{ flexShrink: 0 }}>
            <button className="btn btn-secondary" onClick={fetchStockPosition} disabled={loading}>
              {loading ? <span className="spinner" style={{width:14,height:14}} /> : '🔍'} Tampilkan
            </button>
            <button className="btn btn-primary" onClick={() => handleExport('stock')} disabled={exporting || stockData.length === 0}>
              {exporting ? <span className="spinner" style={{width:14,height:14}} /> : '⬇'} Export Excel
            </button>
          </div>
          <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
              {stockData.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📦</div><p>Klik &quot;Tampilkan&quot; untuk memuat laporan</p></div>
              ) : (
                <table className="data-table">
                  <thead><tr>{Object.keys(stockData[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>
                    {stockData.map((row, i) => (
                      <tr key={i}>
                        {Object.entries(row).map(([k, v]) => (
                          <td key={k}>{k === 'Status' ? <span className={`badge ${STOCK_STYLE[v as string] ?? 'badge-neutral'}`}>{v as string}</span> : typeof v === 'number' ? new Intl.NumberFormat('id-ID').format(v) : v as string}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {stockData.length > 0 && <div className="pagination"><span>{stockData.length} baris data</span></div>}
          </div>
        </>
      )}

      {/* Expiry Report */}
      {activeReport === 'expiry' && (
        <>
          <div className="flex gap-3 items-center" style={{ flexShrink: 0 }}>
            <label className="form-label">Filter hari:</label>
            <select className="form-input" style={{ width: 140 }} value={expiryDays} onChange={e => setExpiryDays(+e.target.value)}>
              <option value={7}>7 hari ke depan</option>
              <option value={14}>14 hari</option>
              <option value={30}>30 hari</option>
              <option value={60}>60 hari</option>
              <option value={90}>90 hari</option>
            </select>
            <button className="btn btn-secondary" onClick={fetchExpiry} disabled={loading}>
              {loading ? <span className="spinner" style={{width:14,height:14}} /> : '🔍'} Tampilkan
            </button>
            <button className="btn btn-primary" onClick={() => handleExport('expiry')} disabled={exporting || expiryData.length === 0}>
              {exporting ? <span className="spinner" style={{width:14,height:14}} /> : '⬇'} Export Excel
            </button>
          </div>
          <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
              {expiryData.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📅</div><p>Klik &quot;Tampilkan&quot; untuk memuat laporan</p></div>
              ) : (
                <table className="data-table">
                  <thead><tr>{Object.keys(expiryData[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>
                    {expiryData.map((row, i) => (
                      <tr key={i}>
                        {Object.entries(row).map(([k, v]) => (
                          <td key={k}>{k === 'Status' ? <span className={`badge ${EXPIRY_STYLE[v as string] ?? 'badge-neutral'}`}>{v as string}</span> : typeof v === 'number' ? new Intl.NumberFormat('id-ID').format(v) : v as string}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {expiryData.length > 0 && <div className="pagination"><span>{expiryData.length} batch</span></div>}
          </div>
        </>
      )}

      {/* Stock Card placeholder */}
      {activeReport === 'card' && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <p>Pilih barang dan gudang untuk melihat kartu stok</p>
            <p className="text-xs">Coming soon — akan ditambahkan pada update berikutnya</p>
          </div>
        </div>
      )}

      {exportedPath && (
        <div style={{ padding: '12px 16px', background: 'var(--success-bg)', borderRadius: 'var(--r-md)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 'var(--text-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span>✅ File tersimpan di: <code style={{ color: 'var(--success)', fontSize: 11 }}>{exportedPath}</code></span>
          <button className="btn btn-secondary btn-sm" onClick={openFolder}>📁 Buka Folder</button>
        </div>
      )}
    </div>
  );
}
