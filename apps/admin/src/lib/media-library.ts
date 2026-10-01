import type { MediaFolder, MediaItem, MediaItemInput, Paginated } from '@iaa/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from './api-client';
import { fetchAllPages } from './pagination';

const PATH = '/admin/media-library';
export const MEDIA_QUERY_KEY = ['resource', 'media-library'] as const;

/**
 * The shared catalogue of everything uploaded through the dashboard.
 *
 * Kept at a generous page size rather than paginated: the picker has to be able
 * to search the whole library, and a few hundred thumbnail records is a small
 * payload next to the images themselves.
 */
export const useMediaLibrary = (enabled = true): UseQueryResult<Paginated<MediaItem>> =>
  useQuery({
    queryKey: MEDIA_QUERY_KEY,
    queryFn: () => fetchAllPages<MediaItem>(`${PATH}?pageSize=100`),
    enabled,
  });

/** What the details dialog saves. */
export interface MediaItemChanges {
  /** Null removes the description; undefined would be dropped by JSON and keep it. */
  altText?: string | null;
  folder: MediaFolder;
  tags: string[];
}

/**
 * The details dialog's changes. An emptied description goes as null, the
 * API's "remove it": sent as '', it was read as no change and the old
 * description stayed after a save that reported success.
 */
export const mediaDetailsChanges = (
  item: Pick<MediaItem, 'altText'>,
  { altText, folder, tags }: { altText: string; folder: MediaFolder; tags: string[] },
): MediaItemChanges => {
  const description = altText.trim();
  if (description) return { altText: description, folder, tags };
  return item.altText ? { altText: null, folder, tags } : { folder, tags };
};

export const useSaveMediaItem = (): UseMutationResult<
  MediaItem,
  Error,
  { id: string; body: MediaItemChanges }
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => api.patch<MediaItem>(`${PATH}/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY }),
  });
};

export const useDeleteMediaItem = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete<void>(`${PATH}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEY }),
  });
};

/**
 * Record an upload in the catalogue.
 *
 * Deliberately forgiving: the upload itself has already succeeded and the form
 * holds a usable asset, so a failure to catalogue it must not surface as a
 * failed upload. The consequence is only that the image will not appear in the
 * library for reuse, which is recoverable by uploading it again.
 */
export const registerMediaItem = async (input: MediaItemInput): Promise<MediaItem | undefined> => {
  try {
    return await api.post<MediaItem>(PATH, input);
  } catch {
    return undefined;
  }
};
