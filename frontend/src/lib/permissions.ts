import type { TabId } from '@/stores/tabs.store';

// ── Role names yang ada di sistem ──────────────────────────────
export type RoleName =
  | 'admin'
  | 'regional_manager'
  | 'kepala_gudang'
  | 'staff_gudang'
  | 'viewer';

// ── Permission set per role ────────────────────────────────────
export interface Permissions {
  /** Tab mana saja yang boleh dibuka */
  allowedTabs:    TabId[];
  /** Bisa membuat transaksi/dokumen baru */
  canCreate:      boolean;
  /** Bisa edit data */
  canEdit:        boolean;
  /** Bisa hapus data */
  canDelete:      boolean;
  /** Bisa melihat harga / nilai stok */
  canViewPrice:   boolean;
  /** Bisa export laporan ke Excel */
  canExport:      boolean;
  /** Bisa kelola user (tab Manajemen User di Settings) */
  canManageUsers: boolean;
  /** Bisa manage Master Barang (edit nama, satuan, kategori) */
  canManageItems: boolean;
}

// ── Definisi akses per role ────────────────────────────────────
export const ROLE_PERMISSIONS: Record<RoleName, Permissions> = {

  /**
   * ADMIN — akses penuh ke semua fitur
   */
  admin: {
    allowedTabs:    ['dashboard', 'items', 'warehouses', 'batches', 'receipts', 'issues', 'transfers', 'reports', 'settings'],
    canCreate:      true,
    canEdit:        true,
    canDelete:      true,
    canViewPrice:   true,
    canExport:      true,
    canManageUsers: true,
    canManageItems: true,
  },

  /**
   * REGIONAL MANAGER — akses semua modul, tidak bisa manage user
   */
  regional_manager: {
    allowedTabs:    ['dashboard', 'items', 'warehouses', 'batches', 'receipts', 'issues', 'transfers', 'reports', 'settings'],
    canCreate:      true,
    canEdit:        true,
    canDelete:      false,
    canViewPrice:   true,
    canExport:      true,
    canManageUsers: false,
    canManageItems: true,
  },

  /**
   * KEPALA GUDANG — semua ops gudang, tapi tidak manage item master & tidak delete
   */
  kepala_gudang: {
    allowedTabs:    ['dashboard', 'items', 'warehouses', 'batches', 'receipts', 'issues', 'transfers', 'reports', 'settings'],
    canCreate:      true,
    canEdit:        true,
    canDelete:      false,
    canViewPrice:   true,
    canExport:      true,
    canManageUsers: false,
    canManageItems: false,
  },

  /**
   * STAFF GUDANG — operasional saja, tidak lihat harga/nilai, tidak export
   */
  staff_gudang: {
    allowedTabs:    ['dashboard', 'batches', 'receipts', 'issues', 'transfers', 'settings'],
    canCreate:      true,
    canEdit:        false,
    canDelete:      false,
    canViewPrice:   false,
    canExport:      false,
    canManageUsers: false,
    canManageItems: false,
  },

  /**
   * VIEWER — hanya lihat laporan dan stok, read-only
   */
  viewer: {
    allowedTabs:    ['dashboard', 'warehouses', 'reports', 'settings'],
    canCreate:      false,
    canEdit:        false,
    canDelete:      false,
    canViewPrice:   true,
    canExport:      true,
    canManageUsers: false,
    canManageItems: false,
  },
};

// ── Default (fallback) — akses minimal jika role tidak dikenal ─
const DEFAULT_PERMISSIONS: Permissions = {
  allowedTabs:    ['dashboard', 'settings'],
  canCreate:      false,
  canEdit:        false,
  canDelete:      false,
  canViewPrice:   false,
  canExport:      false,
  canManageUsers: false,
  canManageItems: false,
};

/**
 * Ambil permissions berdasarkan array role names dari user.
 * Jika user punya lebih dari 1 role, ambil union (OR) dari semua permissions.
 */
export function resolvePermissions(roleNames: string[]): Permissions {
  if (!roleNames || roleNames.length === 0) return DEFAULT_PERMISSIONS;

  const matched = roleNames
    .map(n => ROLE_PERMISSIONS[n as RoleName])
    .filter(Boolean);

  if (matched.length === 0) return DEFAULT_PERMISSIONS;

  // Union: tab dari semua role digabung, boolean diOR
  const tabSet = new Set<TabId>();
  matched.forEach(p => p.allowedTabs.forEach(t => tabSet.add(t)));

  return {
    allowedTabs:    Array.from(tabSet),
    canCreate:      matched.some(p => p.canCreate),
    canEdit:        matched.some(p => p.canEdit),
    canDelete:      matched.some(p => p.canDelete),
    canViewPrice:   matched.some(p => p.canViewPrice),
    canExport:      matched.some(p => p.canExport),
    canManageUsers: matched.some(p => p.canManageUsers),
    canManageItems: matched.some(p => p.canManageItems),
  };
}
