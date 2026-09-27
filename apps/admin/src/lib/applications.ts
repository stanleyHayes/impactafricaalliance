import type {
  AdminApplication,
  ApplicationCounts,
  ApplicationExport,
  ApplicationListItem,
  ApplicationRecommendation,
  ApplicationSort,
  Paginated,
  ReviewableApplicationStatus,
  SortOrder,
} from '@iaa/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api, type ApiError } from './api-client';
import { queryString } from './forms';

/**
 * Applications and their review (plan §3.4). Every key starts with
 * `applications`, so a status change or a review refreshes the lists, the
 * counts behind the tabs and badge, and the application itself at once.
 */
export const APPLICATIONS_KEY = ['applications'] as const;

/**
 * How many applications sit in each reviewable status. The sidebar badge shows
 * the `submitted` count: applications nobody has started reviewing.
 *
 * Polled for the same reason as the submissions badge: the app otherwise never
 * refetches on its own, so a new application would stay invisible until reload.
 */
export const useApplicationCounts = (enabled = true): UseQueryResult<ApplicationCounts> =>
  useQuery({
    queryKey: [...APPLICATIONS_KEY, 'counts'],
    enabled,
    queryFn: () => api.get<ApplicationCounts>('/admin/applications/counts'),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

export interface ApplicationListParams {
  status?: ReviewableApplicationStatus;
  /** Several statuses at once, comma-separated, such as `submitted,under-review`. */
  statuses?: string;
  formId?: string;
  q?: string;
  /** Calendar days of submission, `YYYY-MM-DD`, both inclusive. */
  from?: string;
  to?: string;
  sort?: ApplicationSort;
  order?: SortOrder;
  page: number;
  pageSize: number;
}

export const useApplications = (
  params: ApplicationListParams,
  enabled = true,
): UseQueryResult<Paginated<ApplicationListItem>, ApiError> =>
  useQuery({
    queryKey: [...APPLICATIONS_KEY, 'list', params],
    queryFn: () =>
      api.get<Paginated<ApplicationListItem>>(`/admin/applications${queryString(params)}`),
    enabled,
    placeholderData: keepPreviousData,
  });

export const useApplication = (
  id: string | undefined,
): UseQueryResult<AdminApplication, ApiError> =>
  useQuery({
    queryKey: [...APPLICATIONS_KEY, 'detail', id],
    queryFn: () => api.get<AdminApplication>(`/admin/applications/${id}`),
    enabled: Boolean(id),
  });

const useInvalidateApplications = (): (() => Promise<void>) => {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: APPLICATIONS_KEY });
};

export const useChangeApplicationStatus = (): UseMutationResult<
  AdminApplication,
  ApiError,
  { id: string; status: ReviewableApplicationStatus; note?: string }
> => {
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: ({ id, status, note }) =>
      api.patch<AdminApplication>(`/admin/applications/${id}/status`, {
        status,
        ...(note ? { note } : {}),
      }),
    onSuccess: invalidate,
  });
};

export interface ReviewBody {
  notes: string;
  recommendation?: ApplicationRecommendation;
  score?: number;
}

export const useAddApplicationReview = (): UseMutationResult<
  AdminApplication,
  ApiError,
  { id: string; review: ReviewBody }
> => {
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: ({ id, review }) =>
      api.post<AdminApplication>(`/admin/applications/${id}/reviews`, review),
    onSuccess: invalidate,
  });
};

export const useDeleteApplicationReview = (): UseMutationResult<
  void,
  ApiError,
  { id: string; reviewId: string }
> => {
  const invalidate = useInvalidateApplications();
  return useMutation({
    mutationFn: ({ id, reviewId }) =>
      api.delete<void>(`/admin/applications/${id}/reviews/${reviewId}`),
    onSuccess: invalidate,
  });
};

/**
 * Save a CSV as a file. A byte-order mark goes first, so Excel reads accented
 * names (Ọlá, Gyasi-Nkansah, Côte d'Ivoire) as UTF-8 rather than mangling them.
 */
export const downloadCsv = ({ filename, csv }: ApplicationExport): void => {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Released on the next turn: some browsers start the download after the
  // click returns, and a link revoked at once saves nothing.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

/** Every submitted application to one form, as CSV, saved straight to a file. */
export const useExportApplications = (): UseMutationResult<ApplicationExport, ApiError, string> =>
  useMutation({
    mutationFn: (formId) =>
      api.get<ApplicationExport>(`/admin/applications/export${queryString({ formId })}`),
    onSuccess: downloadCsv,
  });
