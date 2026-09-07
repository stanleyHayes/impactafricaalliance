import type {
  SocialDestination,
  SocialPreviewRequest,
  SocialPublication,
  SocialPublishRequest,
} from '@iaa/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from './api-client';

const PATH = '/admin/social';
export const PUBLICATIONS_KEY = ['social-publications'] as const;

export interface DestinationPreview {
  destination: SocialDestination;
  caption: string;
  /** Why this destination cannot accept the draft as it stands. */
  rejection?: string;
}

/**
 * Draft copy for each destination.
 *
 * A mutation rather than a query: it is an explicit step the editor takes, and
 * re-running it should not be something React Query decides to do on its own
 * while they are part-way through editing the result.
 */
export const usePreviewSocialPost = (): UseMutationResult<
  { previews: DestinationPreview[] },
  Error,
  SocialPreviewRequest
> =>
  useMutation({
    mutationFn: (body) => api.post<{ previews: DestinationPreview[] }>(`${PATH}/preview`, body),
  });

export const usePublishSocial = (): UseMutationResult<
  { publications: SocialPublication[] },
  Error,
  SocialPublishRequest & { articleId?: string }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post<{ publications: SocialPublication[] }>(`${PATH}/publish`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PUBLICATIONS_KEY }),
  });
};

export const useSocialPublications = (articleId?: string): UseQueryResult<SocialPublication[]> =>
  useQuery({
    queryKey: [...PUBLICATIONS_KEY, articleId ?? 'all'],
    queryFn: async () => {
      const query = articleId ? `?articleId=${encodeURIComponent(articleId)}` : '';
      const body = await api.get<{ items: SocialPublication[] }>(`${PATH}/publications${query}`);
      return body.items;
    },
    // Publishing happens on a worker, so the row an editor is watching changes
    // without anything they do. Poll while the page is open.
    refetchInterval: 15_000,
  });

export const useRetryPublication = (): UseMutationResult<SocialPublication, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post<SocialPublication>(`${PATH}/publications/${id}/retry`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PUBLICATIONS_KEY }),
  });
};

export const useCancelPublication = (): UseMutationResult<SocialPublication, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post<SocialPublication>(`${PATH}/publications/${id}/cancel`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PUBLICATIONS_KEY }),
  });
};
