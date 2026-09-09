import type { Paginated } from '@iaa/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api, ApiError } from '../lib/api-client';
import { fetchAllPages } from '../lib/pagination';

import type { ResourceRow } from './types';

const adminPath = (key: string): string => `/admin/${key}`;

export const useResourceList = (key: string): UseQueryResult<Paginated<ResourceRow>> =>
  useQuery({
    queryKey: ['resource', key],
    queryFn: () => fetchAllPages<ResourceRow>(`${adminPath(key)}?pageSize=100`),
  });

export const useResourceDetail = (
  key: string,
  id: string | undefined,
): UseQueryResult<ResourceRow> =>
  useQuery({
    queryKey: ['resource', key, id],
    queryFn: () => api.get<ResourceRow>(`${adminPath(key)}/${id}`),
    enabled: Boolean(id),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });

export const useSaveResource = (
  key: string,
): UseMutationResult<ResourceRow, Error, { id?: string; body: unknown }> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) =>
      id
        ? api.patch<ResourceRow>(`${adminPath(key)}/${id}`, body)
        : api.post<ResourceRow>(adminPath(key), body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource', key] }),
  });
};

export const useDeleteResource = (key: string): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete<void>(`${adminPath(key)}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource', key] }),
  });
};
