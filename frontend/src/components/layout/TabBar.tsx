'use client';
import { useTabsStore } from '@/stores/tabs.store';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function TabBar() {
  const { openTabs, activeTabId, setActive, closeTab, openTab } = useTabsStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar.');
    router.replace('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* App Header */}
      <div className="app-header">
        <button
          onClick={() => openTab('dashboard')}
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <span className="app-logo">
            🏭 Gudang<span>Ku</span>
          </span>
        </button>

        <div style={{ flex: 1 }} />

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {user?.roles?.[0]?.name ?? 'user'}
            </div>
          </div>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff',
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            title="Keluar"
          >
            ⇥
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
      {openTabs.map(tab => (
          <div
            key={tab.id}
            role="button"
            tabIndex={0}
            className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => setActive(tab.id)}
            onKeyDown={(e) => e.key === 'Enter' && setActive(tab.id)}
          >
            <span>{tab.icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
            {tab.id !== 'dashboard' && (
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                title="Tutup"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
