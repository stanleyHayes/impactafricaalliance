import { localDateKey, type TaskSummary } from '@iaa/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from './api-client';

/**
 * The caller's own open work: overdue, due today, upcoming. Drives the Tasks
 * badge in the sidebar and, later, the dashboard.
 *
 * "Today" is the device's calendar day, sent with every request rather than
 * left to the server, whose clock is UTC. It is worked out when the request is
 * made, so a console left open overnight moves on to the new day at its next
 * refresh.
 *
 * Polled like the submissions badge: the app otherwise never refetches on its
 * own, and a badge that only updates on reload does not do its job.
 */
export const useTaskSummary = (enabled = true): UseQueryResult<TaskSummary> =>
  useQuery({
    queryKey: ['tasks', 'summary'],
    enabled,
    queryFn: () => api.get<TaskSummary>(`/admin/tasks/summary?today=${localDateKey()}`),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
