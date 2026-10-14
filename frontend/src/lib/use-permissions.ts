'use client';

import { useAuth } from './auth-context';

export function usePermissions() {
  const { user } = useAuth();

  const can = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'DEPT_MANAGER') {
      const perms = user.permissions || [];
      return perms.includes(`${resource}:${action}`);
    }
    return false;
  };

  return { can, user };
}
