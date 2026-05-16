'use client';
import { useTabsStore } from '@/stores/tabs.store';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  IconLogo, IconDashboard, IconPackage, IconWarehouse, IconBatch,
  IconReceipt, IconIssue, IconTransfer, IconReport, IconSettings,
  IconUser, IconLogout, IconClose,
} from '@/components/ui/Icons';
import type { TabId } from '@/stores/tabs.store';

// Map tab id ke ikon komponen
const TAB_ICONS: Record<TabId, React.ComponentType<{ size?: number; color?: string }>> = {
  dashboard:  IconDashboard,
  items:      IconPackage,
  warehouses: IconWarehouse,
  batches:    IconBatch,
  receipts:   IconReceipt,
  issues:     IconIssue,
  transfers:  IconTransfer,
  reports:    IconReport,
  settings:   IconSettings,
};

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
      {/* ── App Header ─────────────────────────── */}
      <div className="app-header">
        <button
          onClick={() => openTab('dashboard')}
          style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10 }}
        >
          {/* Logo with glow */}
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(59,130,246,0.45)',
          }}>
            <IconLogo size={20} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Gudang<span style={{ color: 'var(--primary)' }}>Ku</span>
          </span>
        </button>

        <div style={{ flex: 1 }} />

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
            boxShadow: '0 0 0 2px var(--border)',
          }}>
            {user?.name?.[0]?.toUpperCase() ?? <IconUser size={15} color="#fff" />}
          </div>

          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {user?.roles?.[0]?.name ?? 'user'}
            </div>
          </div>

          {/* Logout Button */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleLogout}
            title="Keluar"
            style={{ marginLeft: 4 }}
          >
            <IconLogout size={16} />
          </button>
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────── */}
      <div className="tab-bar">
        {openTabs.map(tab => {
          const TabIcon = TAB_ICONS[tab.id];
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => e.key === 'Enter' && setActive(tab.id)}
            >
              <span style={{ opacity: isActive ? 1 : 0.6, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <TabIcon size={14} />
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 'var(--text-xs)', fontWeight: isActive ? 600 : 500 }}>
                {tab.label}
              </span>
              {tab.id !== 'dashboard' && (
                <button
                  className="tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  title="Tutup tab"
                >
                  <IconClose size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
