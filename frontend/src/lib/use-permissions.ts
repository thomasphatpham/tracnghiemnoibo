'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from './auth-context';

export function usePermissions() {
  const { user } = useAuth();

  // Tạo chuỗi đại diện permissions được sắp xếp để đảm bảo tính ổn định của con trỏ hàm
  const permissionsKey = useMemo(() => {
    return (user?.permissions || []).slice().sort().join(',');
  }, [user?.permissions]);

  const can = useCallback(
    (resource: string, action: string): boolean => {
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      if (user.role === 'DEPT_MANAGER') {
        const perms = user.permissions || [];
        return perms.includes(`${resource}:${action}`);
      }
      return false;
    },
    [user?.id, user?.role, permissionsKey]
  );

  return { can, user };
}
