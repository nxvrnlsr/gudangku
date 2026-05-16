'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useTabsStore, TAB_DEFINITIONS, type TabId } from '@/stores/tabs.store';
import TabBar from '@/components/layout/TabBar';
import DashboardModule   from '@/components/modules/DashboardModule';
import ItemsModule       from '@/components/modules/ItemsModule';
import WarehousesModule  from '@/components/modules/WarehousesModule';
import BatchesModule     from '@/components/modules/BatchesModule';
import ReceiptsModule    from '@/components/modules/ReceiptsModule';
import IssuesModule      from '@/components/modules/IssuesModule';
import TransfersModule   from '@/components/modules/TransfersModule';
import ReportsModule     from '@/components/modules/ReportsModule';
import SettingsModule    from '@/components/modules/SettingsModule';

// Map tab ID ke komponen modul
const MODULE_MAP: Record<TabId, React.ComponentType> = {
  dashboard:  DashboardModule,
  items:      ItemsModule,
  warehouses: WarehousesModule,
  batches:    BatchesModule,
  receipts:   ReceiptsModule,
  issues:     IssuesModule,
  transfers:  TransfersModule,
  reports:    ReportsModule,
  settings:   SettingsModule,
};

export default function DashboardPage() {
  const { isAuthenticated } = useAuthStore();
  const { openTabs, activeTabId } = useTabsStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header + Tab Bar */}
      <TabBar />

      {/* Tab Content Area — render semua tab tapi sembunyikan yang tidak aktif */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {openTabs.map(tab => {
          const Module = MODULE_MAP[tab.id];
          return (
            <div
              key={tab.id}
              style={{
                position: 'absolute',
                inset: 0,
                display: activeTabId === tab.id ? 'flex' : 'none',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Module />
            </div>
          );
        })}
      </div>
    </div>
  );
}
