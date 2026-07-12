import type { UserRole } from '@iaa/shared';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from './AuthContext';

interface RequireRoleProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Gate a route for users with one of the allowed roles. */
export const RequireRole = ({
  roles,
  children,
  fallback = <Navigate to="/" replace />,
}: RequireRoleProps): JSX.Element => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
