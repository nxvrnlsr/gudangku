'use client';
import { useTabsStore } from '@/stores/tabs.store';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissions } from '@/hooks/usePermissions';
import { useT } from '@/hooks/useT';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  IconLogo, IconDashboard, IconPackage, IconWarehouse, IconBatch,
  IconReceipt, IconIssue, IconTransfer, IconReport, IconSettings,
  IconUser, IconLogout, IconClose,
} from '@/components/ui/Icons';
import type { TabId } from '@/stores/tabs.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

// ── Tab icon map ───────────────────────────────────────────────
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

// ── Role display config ────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  admin:            '#EF4444',
  regional_manager: '#F59E0B',
  kepala_gudang:    '#3B82F6',
  staff_gudang:     '#10B981',
  viewer:           '#8B5CF6',
};
const ROLE_LABEL: Record<string, string> = {
  admin:            'Admin',
  regional_manager: 'Regional Manager',
  kepala_gudang:    'Kepala Gudang',
  staff_gudang:     'Staff Gudang',
  viewer:           'Viewer',
};

export default function TabBar() {
  const { openTabs, activeTabId, setActive, closeTab, openTab } = useTabsStore();
  const { user, logout } = useAuthStore();
  const permissions = usePermissions();
  const { t } = useT();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    toast.success(t('auth.logoutSuccess'));
    router.replace('/');
  };

  // Guard: check permission before opening tab
  const handleOpenTab = (id: TabId) => {
    if (!permissions.allowedTabs.includes(id)) {
      toast.error(t('common.forbidden'));
      return;
    }
    openTab(id);
  };
  void handleOpenTab;

  const primaryRole = user?.roles?.[0]?.name ?? 'user';
  const roleColor   = ROLE_COLOR[primaryRole] ?? '#64748B';
  const roleLabel   = ROLE_LABEL[primaryRole] ?? primaryRole;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* ── App Header ─────────────────────────── */}
      <div className="app-header">
        <button
          onClick={() => openTab('dashboard')}
          style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center', gap: 10 }}
        >
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

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
          {/* Avatar with role color */}
          <div style={{
            width: 32, height: 32,
            background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}bb 100%)`,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
            boxShadow: `0 0 0 2px var(--border), 0 0 8px ${roleColor}40`,
          }}>
            {user?.name?.[0]?.toUpperCase() ?? <IconUser size={15} color="#fff" />}
          </div>

          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.name}
            </div>
            {/* Role badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: roleColor, flexShrink: 0,
              }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Logout */}
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
                {t(tab.label)}
              </span>
              {tab.id !== 'dashboard' && (
                <button
                  className="tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  title={t('common.close')}
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
