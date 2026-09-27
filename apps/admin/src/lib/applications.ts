import type { ApplicationCounts } from '@iaa/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from './api-client';

/**
 * How many applications sit in each reviewable status. The sidebar badge shows
 * the `submitted` count: applications nobody has started reviewing.
 *
 * Polled for the same reason as the submissions badge: the app otherwise never
 * refetches on its own, so a new application would stay invisible until reload.
 */
export const useApplicationCounts = (enabled = true): UseQueryResult<ApplicationCounts> =>
  useQuery({
    queryKey: ['applications', 'counts'],
    enabled,
    queryFn: () => api.get<ApplicationCounts>('/admin/applications/counts'),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
