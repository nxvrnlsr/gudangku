import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { resolvePermissions, type Permissions } from '@/lib/permissions';

/**
 * Hook untuk mendapatkan permissions user yang sedang login.
 * Memoized — hanya recalculate jika user berubah.
 */
export function usePermissions(): Permissions {
  const { user } = useAuthStore();

  return useMemo(() => {
    const roleNames = user?.roles?.map((r: { name: string }) => r.name) ?? [];
    return resolvePermissions(roleNames);
  }, [user]);
}
