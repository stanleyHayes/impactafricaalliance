import { type AdminResource, type Permission, type PermissionAction } from '@iaa/shared';
import { useMemo } from 'react';

import { useAuth } from './AuthContext';

export const useCan = (): ((action: PermissionAction, resource: AdminResource) => boolean) => {
  const { user } = useAuth();
  return useMemo(() => {
    const permissions = new Set<Permission>(user?.permissions ?? []);
    return (action, resource) => permissions.has(`${resource}:${action}` as Permission);
  }, [user?.permissions]);
};

export const useHasPermission = (action: PermissionAction, resource: AdminResource): boolean => {
  const can = useCan();
  return can(action, resource);
};
