import type { PublicForm } from '@iaa/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { getPreviewForm, getPublicForm } from './api';
import { isTransient } from './errors';

/**
 * Where the flow's form comes from: a published form by slug, or a staff
 * preview reached with a short-lived token (plan D10).
 */
export type FormSource = { kind: 'public'; slug: string } | { kind: 'preview'; token: string };

/** Query keys start with the feature's key so the cache can be cleared by prefix. */
export const applicationFormKey = (source: FormSource): readonly string[] =>
  source.kind === 'public'
    ? ['applications', 'form', source.slug]
    : ['applications', 'preview', source.token];

// The API sleeps on a free plan and a cold start can take about a minute, so
// a missing answer is tried a few more times, further apart each time, before
// the page gives up and offers Retry. Refusals (404 and the like) are final.
const MAX_LOAD_RETRIES = 3;

/**
 * The form the applicant is filling in. Shared by the page (for its title)
 * and the flow, so both read the same cached copy.
 */
export const useApplicationForm = (source: FormSource): UseQueryResult<PublicForm, Error> =>
  useQuery({
    queryKey: applicationFormKey(source),
    queryFn: ({ signal }) =>
      source.kind === 'public'
        ? getPublicForm(source.slug, signal)
        : getPreviewForm(source.token, signal),
    enabled: source.kind === 'public' ? source.slug !== '' : source.token !== '',
    retry: (failureCount, error) => isTransient(error) && failureCount < MAX_LOAD_RETRIES,
    retryDelay: (attempt) => Math.min(3000 * 2 ** attempt, 20_000),
    staleTime: 30_000,
  });
