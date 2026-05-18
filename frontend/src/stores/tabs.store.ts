import { create } from 'zustand';

export type TabId =
  | 'dashboard'
  | 'items'
  | 'warehouses'
  | 'batches'
  | 'receipts'
  | 'issues'
  | 'transfers'
  | 'reports'
  | 'settings';

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

// Tab definitions — labels are i18n keys resolved by TabBar
export const TAB_DEFINITIONS: Record<TabId, Tab> = {
  dashboard:  { id: 'dashboard',  label: 'tabs.dashboard',  icon: '⊞' },
  items:      { id: 'items',      label: 'tabs.items',      icon: '📦' },
  warehouses: { id: 'warehouses', label: 'tabs.warehouses', icon: '🏭' },
  batches:    { id: 'batches',    label: 'tabs.batches',    icon: '📅' },
  receipts:   { id: 'receipts',   label: 'tabs.receipts',   icon: '📥' },
  issues:     { id: 'issues',     label: 'tabs.issues',     icon: '📤' },
  transfers:  { id: 'transfers',  label: 'tabs.transfers',  icon: '🔀' },
  reports:    { id: 'reports',    label: 'tabs.reports',    icon: '📊' },
  settings:   { id: 'settings',  label: 'tabs.settings',   icon: '⚙️' },
};

interface TabsState {
  openTabs: Tab[];
  activeTabId: TabId;
  openTab: (id: TabId) => void;
  closeTab: (id: TabId) => void;
  setActive: (id: TabId) => void;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  // Dashboard selalu terbuka pertama kali
  openTabs: [TAB_DEFINITIONS.dashboard],
  activeTabId: 'dashboard',

  openTab: (id: TabId) => {
    const { openTabs } = get();
    const tab = TAB_DEFINITIONS[id];
    const exists = openTabs.find(t => t.id === id);
    if (!exists) {
      set({ openTabs: [...openTabs, tab], activeTabId: id });
    } else {
      set({ activeTabId: id });
    }
  },

  closeTab: (id: TabId) => {
    const { openTabs, activeTabId } = get();
    // Dashboard tidak bisa ditutup
    if (id === 'dashboard') return;
    const filtered = openTabs.filter(t => t.id !== id);
    // Jika yang ditutup adalah tab aktif, aktifkan tab terakhir
    const newActive = activeTabId === id
      ? (filtered[filtered.length - 1]?.id ?? 'dashboard')
      : activeTabId;
    set({ openTabs: filtered, activeTabId: newActive });
  },

  setActive: (id: TabId) => set({ activeTabId: id }),
}));
