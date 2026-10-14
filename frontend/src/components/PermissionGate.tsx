'use client';

import React from 'react';
import { usePermissions } from '@/lib/use-permissions';

interface PermissionGateProps {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ resource, action, children, fallback = null }: PermissionGateProps) {
  const { can } = usePermissions();
  if (can(resource, action)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
