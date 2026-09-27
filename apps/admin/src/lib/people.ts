import { PEOPLE_IDS_MAX, type Paginated, type PersonSummary } from '@iaa/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from './api-client';

const PATH = '/admin/people';

/** Prefix for every people-directory query, so one invalidation refreshes them all. */
export const PEOPLE_QUERY_KEY = ['people'] as const;

/** Rows a picker shows while someone is searching. A short list is easier to scan. */
const SEARCH_PAGE_SIZE = 20;

// The same test the API applies. A malformed id would make it refuse the
// whole lookup with a 400, so one bad value on a record would blank every
// name beside it.
const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * Colleagues whose name or email matches `q`, for an assignee or reviewer
 * picker. An empty `q` lists everyone, which on a team this size is the
 * quickest way to find someone.
 *
 * The directory only returns active accounts and only their name, email and
 * role, which is why editors may search it when they cannot see the user list.
 */
export const usePeopleSearch = (
  q: string,
  enabled = true,
): UseQueryResult<Paginated<PersonSummary>> => {
  const term = q.trim();
  return useQuery({
    queryKey: [...PEOPLE_QUERY_KEY, 'search', term],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: String(SEARCH_PAGE_SIZE) });
      if (term) params.set('q', term);
      return api.get<Paginated<PersonSummary>>(`${PATH}?${params.toString()}`);
    },
    enabled,
    // Keeps the last matches on screen while the next ones load, so the list
    // does not blink empty on every keystroke.
    placeholderData: keepPreviousData,
    // People change rarely; a minute saves a request each time a picker opens.
    staleTime: 60_000,
  });
};

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
};

/**
 * The people behind a list of stored ids, so chips on a record can show names
 * rather than ids.
 *
 * Someone who has left, or whose account was switched off, is simply absent
 * from the answer; callers show a neutral placeholder for them. The API
 * resolves at most `PEOPLE_IDS_MAX` ids a request, so longer lists are split.
 */
export const usePeople = (ids: readonly string[]): UseQueryResult<PersonSummary[]> => {
  // Sorted and de-duplicated so the same people in a different order share a
  // cache entry instead of fetching again.
  const unique = [...new Set(ids.filter((id) => OBJECT_ID.test(id)))].sort();
  return useQuery({
    queryKey: [...PEOPLE_QUERY_KEY, 'ids', unique],
    queryFn: async () => {
      const pages = await Promise.all(
        chunk(unique, PEOPLE_IDS_MAX).map((batch) => {
          // The envelope pages by default, so ask for a page as long as the batch.
          const params = new URLSearchParams({
            ids: batch.join(','),
            pageSize: String(batch.length),
          });
          return api.get<Paginated<PersonSummary>>(`${PATH}?${params.toString()}`);
        }),
      );
      return pages.flatMap((page) => page.items);
    },
    enabled: unique.length > 0,
    staleTime: 60_000,
  });
};
