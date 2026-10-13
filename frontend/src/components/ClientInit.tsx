'use client';

import { useEffect } from 'react';
import { suppressConsoleInProduction } from '@/lib/suppress-console';

/**
 * Component client-side, chạy 1 lần duy nhất để tắt console trong production.
 * Đặt ở root layout để áp dụng toàn app.
 */
export function ClientInit() {
  useEffect(() => {
    suppressConsoleInProduction();
  }, []);

  return null;
}
