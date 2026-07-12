import type { AdminResource, PermissionAction } from '@iaa/shared';
import type { ReactNode } from 'react';

import { useHasPermission } from './useCan';

interface RequirePermissionProps {
  action: PermissionAction;
  resource: AdminResource;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequirePermission = ({
  action,
  resource,
  children,
  fallback = null,
}: RequirePermissionProps): JSX.Element => {
  const allowed = useHasPermission(action, resource);
  return allowed ? <>{children}</> : <>{fallback}</>;
};
