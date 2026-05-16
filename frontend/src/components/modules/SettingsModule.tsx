'use client';
import { useEffect, useState, useCallback } from 'react';
import { authApi, usersApi, reportsApi } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';
import {
  IconSettings, IconUser, IconClose, IconPlus, IconCheck,
} from '@/components/ui/Icons';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────
interface Role   { id: string; name: string; }
interface AppUser {
  id: string; name: string; email: string;
  is_active: boolean; roles: string[];
  created_at: string; last_login_at: string | null;
}

// ── Sub-icons ─────────────────────────────────────────────────
const IconLock    = (p: { size?: number; color?: string }) => (
  <svg width={p.size??18} height={p.size??18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    style={{ color: p.color ?? 'currentColor' }} aria-hidden>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconUsers = (p: { size?: number; color?: string }) => (
  <svg width={p.size??18} height={p.size??18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    style={{ color: p.color ?? 'currentColor' }} aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconFolder2 = (p: { size?: number; color?: string }) => (
  <svg width={p.size??18} height={p.size??18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
    style={{ color: p.color ?? 'currentColor' }} aria-hidden>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

// ── Role badge color map ──────────────────────────────────────
const ROLE_CLASS: Record<string, string> = {
  admin:       'badge-danger',
  manager:     'badge-warning',
  staff:       'badge-info',
  viewer:      'badge-neutral',
  warehouse:   'badge-success',
};

type Tab = 'password' | 'users' | 'export';

// ── Modal — defined OUTSIDE SettingsModule to prevent remount on every render ──
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
        borderRadius: 'var(--r-lg)', padding: 28, width: 420, boxShadow: 'var(--shadow-lg)',
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

export default function SettingsModule() {

  const { user: me } = useAuthStore();
  const isAdmin = me?.roles?.some((r: { name: string }) => r.name === 'admin') ?? false;

  const [activeTab, setActiveTab] = useState<Tab>('password');

  // ── Change Password state ─────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast.error('Konfirmasi password tidak cocok.'); return;
    }
    if (pwForm.next.length < 8) {
      toast.error('Password baru minimal 8 karakter.'); return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      toast.success('Password berhasil diubah!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Gagal mengubah password.');
    } finally { setPwLoading(false); }
  };

  // ── User Management state ─────────────────────────────────
  const [users,    setUsers]    = useState<AppUser[]>([]);
  const [roles,    setRoles]    = useState<Role[]>([]);
  const [uLoading, setULoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser,   setEditUser]   = useState<AppUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPw,    setResetPw]    = useState('');

  // Single-select role for new user
  const [newForm, setNewForm] = useState({
    name: '', email: '', password: '', role_id: '',
  });

  const loadRoles = useCallback(async () => {
    try {
      const rRes = await usersApi.getRoles();
      setRoles(rRes.data.data);
    } catch { /* silently ignore, will show empty */ }
  }, []);

  const loadUsers = useCallback(async () => {
    setULoading(true);
    try {
      const uRes = await usersApi.list();
      setUsers(uRes.data.data);
    } catch { toast.error('Gagal memuat data pengguna.'); }
    finally { setULoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      loadRoles();
      loadUsers();
    }
  }, [activeTab, isAdmin, loadUsers, loadRoles]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersApi.create({
        name: newForm.name,
        email: newForm.email,
        password: newForm.password,
        role_ids: newForm.role_id ? [newForm.role_id] : [],
      });
      toast.success('Pengguna berhasil dibuat!');
      setShowCreate(false);
      setNewForm({ name: '', email: '', password: '', role_id: '' });
      loadUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Gagal membuat pengguna.');
    }
  };


  const handleToggleActive = async (u: AppUser) => {
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      toast.success(`Pengguna ${u.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`);
      loadUsers();
    } catch { toast.error('Gagal mengubah status.'); }
  };

  const handleUpdateRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await usersApi.update(editUser.id, {
        name: editUser.name,
        role_ids: editUser.roles.map(rName => roles.find(r => r.name === rName)?.id ?? '').filter(Boolean),
      });
      toast.success('Role berhasil diperbarui.');
      setEditUser(null);
      loadUsers();
    } catch { toast.error('Gagal memperbarui role.'); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || resetPw.length < 8) {
      toast.error('Password minimal 8 karakter.'); return;
    }
    try {
      await usersApi.resetPassword(resetTarget.id, resetPw);
      toast.success(`Password ${resetTarget.name} berhasil direset.`);
      setResetTarget(null);
      setResetPw('');
    } catch { toast.error('Gagal reset password.'); }
  };

  // ── Export path state ─────────────────────────────────────
  const [exportPath, setExportPath] = useState('');
  const [epLoading, setEpLoading]   = useState(false);

  useEffect(() => {
    if (activeTab === 'export') {
      reportsApi.getExportSettings().then(r => setExportPath(r.data.data?.export_path ?? ''));
    }
  }, [activeTab]);

  const handleSaveExportPath = async () => {
    setEpLoading(true);
    try {
      await reportsApi.updateExportPath(exportPath);
      toast.success('Path export berhasil disimpan.');
    } catch { toast.error('Gagal menyimpan path.'); }
    finally { setEpLoading(false); }
  };

  // ── TAB CONFIG ────────────────────────────────────────────
  const TABS: { id: Tab; label: string; Icon: React.ComponentType<{size?:number;color?:string}> }[] = [
    { id: 'password', label: 'Ganti Password', Icon: IconLock },
    ...(isAdmin ? [{ id: 'users' as Tab, label: 'Manajemen User', Icon: IconUsers }] : []),
    { id: 'export',   label: 'Path Export',    Icon: IconFolder2 },
  ];

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconSettings size={20} color="var(--icon-muted)" /> Pengaturan
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2" style={{ flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Ganti Password ──────────────────────────── */}
      {activeTab === 'password' && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconLock size={15} color="var(--icon-primary)" /> Ganti Password
          </div>
          <form onSubmit={handleChangePassword} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Password Saat Ini</label>
              <input className="form-input" type="password" required placeholder="••••••••"
                value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password Baru</label>
              <input className="form-input" type="password" required placeholder="Min. 8 karakter"
                value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Konfirmasi Password Baru</label>
              <input className="form-input" type="password" required placeholder="Ulangi password baru"
                value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={pwLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
              {pwLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={14} />}
              Simpan Password
            </button>
          </form>
        </div>
      )}

      {/* ── TAB: Manajemen User ───────────────────────────── */}
      {activeTab === 'users' && isAdmin && (
        <>
          <div className="flex gap-3" style={{ flexShrink: 0, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconPlus size={14} /> Tambah User
            </button>
          </div>

          <div className="panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {uLoading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : (
              <div className="table-wrap" style={{ flex: 1, overflow: 'auto', border: 'none', borderRadius: 0 }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Nama</th><th>Email</th><th>Role</th>
                    <th>Status</th><th>Login Terakhir</th><th>Aksi</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 500 }}>{u.name}</td>
                        <td className="text-secondary text-xs" style={{ fontFamily: 'monospace' }}>{u.email}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {u.roles.map(r => (
                              <span key={r} className={`badge ${ROLE_CLASS[r] ?? 'badge-neutral'}`}>{r}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${u.is_active ? 'badge-success' : 'badge-neutral'}`}>
                            {u.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="text-xs text-secondary">
                          {u.last_login_at
                            ? new Date(u.last_login_at).toLocaleDateString('id-ID')
                            : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm"
                              onClick={() => setEditUser({ ...u, roles: [...u.roles] })}>
                              Edit Role
                            </button>
                            <button className="btn btn-secondary btn-sm"
                              onClick={() => { setResetTarget(u); setResetPw(''); }}>
                              Reset PW
                            </button>
                            <button
                              className={`btn btn-sm ${u.is_active ? 'btn-ghost' : 'btn-secondary'}`}
                              onClick={() => handleToggleActive(u)}
                              disabled={u.id === me?.id}
                            >
                              {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: Export Path ─────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="panel" style={{ maxWidth: 560 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconFolder2 size={15} color="var(--icon-warning)" /> Lokasi Export Excel
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className="text-secondary text-sm">
              File Excel akan disimpan ke folder berikut secara default.
              Kosongkan untuk menggunakan path default sistem.
            </p>
            <div className="form-group">
              <label className="form-label">Path Folder</label>
              <input className="form-input" type="text"
                placeholder="C:\Users\...\Documents\GudangKu\Exports"
                value={exportPath} onChange={e => setExportPath(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleSaveExportPath} disabled={epLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
              {epLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <IconCheck size={14} />}
              Simpan Path
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Buat User Baru ────────────────────────── */}
      {showCreate && (
        <Modal title="Tambah Pengguna Baru" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input className="form-input" required placeholder="John Doe"
                value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" required placeholder="john@perusahaan.com"
                value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password Awal</label>
              <input className="form-input" type="password" required placeholder="Min. 8 karakter"
                value={newForm.password} onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Role <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(pilih satu)</span></label>
              {roles.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  <span className="spinner" style={{ width: 12, height: 12 }} /> Memuat daftar role...
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  {roles.map(r => {
                    const selected = newForm.role_id === r.id;
                    return (
                      <button key={r.id} type="button"
                        onClick={() => setNewForm(f => ({ ...f, role_id: r.id }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 12px',
                          background: selected ? 'rgba(59,130,246,0.15)' : 'var(--bg-surface)',
                          border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: 'var(--r-md)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                        }}
                      >
                        {/* Radio dot */}
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${selected ? 'var(--primary)' : 'var(--border-bright)'}`,
                          background: selected ? 'var(--primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <span style={{
                          fontSize: 'var(--text-sm)', fontWeight: selected ? 600 : 400,
                          color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          textTransform: 'capitalize',
                        }}>{r.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Batal</button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconPlus size={13} /> Buat Pengguna
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Edit Role ─────────────────────────────── */}
      {editUser && (
        <Modal title={`Edit Role — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <form onSubmit={handleUpdateRoles} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nama</label>
              <input className="form-input"
                value={editUser.name} onChange={e => setEditUser(u => u ? { ...u, name: e.target.value } : u)} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {roles.map(r => {
                  const selected = editUser.roles.includes(r.name);
                  return (
                    <button key={r.id} type="button"
                      className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setEditUser(u => {
                        if (!u) return u;
                        const next = selected
                          ? u.roles.filter(x => x !== r.name)
                          : [...u.roles, r.name];
                        return { ...u, roles: next };
                      })}
                    >
                      {selected && <IconCheck size={11} />} {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditUser(null)}>Batal</button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconCheck size={13} /> Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Reset Password ────────────────────────── */}
      {resetTarget && (
        <Modal title={`Reset Password — ${resetTarget.name}`} onClose={() => setResetTarget(null)}>
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="text-secondary text-sm">
              Password baru untuk <strong>{resetTarget.email}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Password Baru</label>
              <input className="form-input" type="password" required placeholder="Min. 8 karakter"
                value={resetPw} onChange={e => setResetPw(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setResetTarget(null)}>Batal</button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconCheck size={13} /> Reset Password
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
