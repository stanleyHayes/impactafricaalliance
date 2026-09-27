import {
  PREVIEW_TOKEN_HEADER,
  type Paginated,
  type PublicImpactStory,
  type PublicImpactStoryListItem,
} from '@iaa/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { apiGet } from '../../lib/api-client';

/** Prefix for every impact story query on the site. */
export const IMPACT_STORIES_KEY = ['impact-stories'] as const;

/** Cards per "Load more". Three rows of three on a wide screen. */
export const STORIES_PAGE_SIZE = 9;

// The API's own cap on one page: the most stories the filters are built from.
const FACET_PAGE_SIZE = 100;

/** The filters a visitor can apply on the stories page. Empty means "all". */
export interface ImpactStoryFilters {
  programme?: string;
  country?: string;
}

const listPath = (filters: ImpactStoryFilters, page: number, pageSize: number): string => {
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.programme) search.set('programme', filters.programme);
  if (filters.country) search.set('country', filters.country);
  return `/impact-stories?${search.toString()}`;
};

/**
 * One page of published stories. The stories page asks for page 1, then 2
 * and so on as the visitor presses "Load more"; each page is cached on its
 * own, so going back to the list shows what was already loaded at once.
 */
export const useImpactStories = (
  filters: ImpactStoryFilters,
  page: number,
): UseQueryResult<Paginated<PublicImpactStoryListItem>> =>
  useQuery({
    queryKey: [...IMPACT_STORIES_KEY, 'list', filters.programme ?? '', filters.country ?? '', page],
    queryFn: ({ signal }) =>
      apiGet<Paginated<PublicImpactStoryListItem>>(
        listPath(filters, page, STORIES_PAGE_SIZE),
        signal,
      ),
    placeholderData: keepPreviousData,
  });

/**
 * The newest published stories, unfiltered, for building the filter chips:
 * a programme or country is offered only when a story carries it, so a chip
 * never leads to an empty page.
 */
export const useImpactStoryFacets = (): UseQueryResult<Paginated<PublicImpactStoryListItem>> =>
  useQuery({
    queryKey: [...IMPACT_STORIES_KEY, 'facets'],
    queryFn: ({ signal }) =>
      apiGet<Paginated<PublicImpactStoryListItem>>(listPath({}, 1, FACET_PAGE_SIZE), signal),
    staleTime: 5 * 60_000,
  });

/** One published story by its address. A draft or unknown address is a 404. */
export const useImpactStory = (slug: string): UseQueryResult<PublicImpactStory> =>
  useQuery({
    queryKey: [...IMPACT_STORIES_KEY, 'detail', slug],
    queryFn: ({ signal }) =>
      apiGet<PublicImpactStory>(`/impact-stories/${encodeURIComponent(slug)}`, signal),
    enabled: Boolean(slug),
  });

/**
 * A story in any status, for staff checking it before it goes live. The
 * token travels in a header, never the address, so it reaches no log.
 */
export const useImpactStoryPreview = (token: string): UseQueryResult<PublicImpactStory> =>
  useQuery({
    queryKey: [...IMPACT_STORIES_KEY, 'preview', token],
    queryFn: ({ signal }) =>
      apiGet<PublicImpactStory>('/impact-stories/preview', signal, {
        headers: { [PREVIEW_TOKEN_HEADER]: token },
      }),
    enabled: Boolean(token),
    // A preview is checked for the latest edits every time it is opened.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
