import { UserRole, type PublicUser } from '@iaa/shared';
import { useCallback } from 'react';

import { useAuth } from './AuthContext';

/** Pages only an administrator reaches, whatever their permissions say. */
const ADMIN_ONLY = new Set(['donations', 'users', 'social-connections']);

/** Pages everyone signed in may open: their own account, and the analytics overview. */
const OPEN_TO_ALL = new Set(['account', 'analytics', 'social-connections']);

/**
 * The permission key a console path needs, from its first segment
 * (`/impact-stories` needs `impact-stories:read`), apart from the few mapped
 * here. Notifications are unread submissions, so they need submissions.
 */
const resourceOf = (to: string): string | undefined => {
  const path = (to.split(/[?#]/)[0] ?? '').split('/').filter(Boolean);
  const [first, second] = path;
  if (first === 'content') return second;
  if (first === 'media') return 'media-library';
  if (first === 'account' && second === 'notifications') return 'submissions';
  return first;
};

/**
 * Whether this person may open a console path: the one rule the sidebar, the
 * dashboard and every link into another module share, and the same one the
 * routes enforce. A module someone cannot read appears nowhere.
 */
export const mayOpenPath = (user: PublicUser | null, to: string): boolean => {
  const resource = resourceOf(to);
  if (!resource) return true;
  if (ADMIN_ONLY.has(resource) && user?.role !== UserRole.Admin) return false;
  if (OPEN_TO_ALL.has(resource)) return true;
  return Boolean(user?.permissions.some((permission) => permission === `${resource}:read`));
};

/** `mayOpenPath` for the signed-in person. */
export const useMayOpen = (): ((to: string) => boolean) => {
  const { user } = useAuth();
  return useCallback((to: string) => mayOpenPath(user, to), [user]);
};
