import { z } from 'zod';

import { type Timestamped } from './common.js';
import { partialForUpdate } from './update.js';

/**
 * Folders the library groups uploads under. Deliberately few: a folder an
 * editor has to think about is a folder they will file things in wrongly.
 */
export const MEDIA_FOLDERS = ['site', 'team', 'events', 'news', 'gallery', 'documents'] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const MEDIA_FOLDER_LABELS: Record<MediaFolder, string> = {
  site: 'Site imagery',
  team: 'Team portraits',
  events: 'Events',
  news: 'News & stories',
  gallery: 'Gallery',
  documents: 'Documents',
};

/**
 * One item in the shared media library.
 *
 * Every upload made anywhere in the dashboard is recorded here, so a photo can
 * be found and reused instead of being uploaded again for each place it
 * appears. The record is a catalogue entry: the file itself lives on
 * Cloudinary, and `publicId` is what ties the two together.
 */
export const mediaItemInputSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1).max(300),
  /** Original filename, so an editor can recognise what they uploaded. */
  filename: z.string().min(1).max(300).trim(),
  folder: z.enum(MEDIA_FOLDERS).default('site'),
  /**
   * Describes the picture for screen readers. Not required: an image blocked
   * behind a description field is an image that gets uploaded somewhere else.
   */
  altText: z
    .string()
    .max(300)
    .trim()
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bytes: z.number().int().nonnegative().optional(),
  format: z.string().max(20).optional(),
});
export type MediaItemInput = z.infer<typeof mediaItemInputSchema>;

export const mediaItemUpdateSchema = partialForUpdate(mediaItemInputSchema);
export type MediaItemUpdate = z.infer<typeof mediaItemUpdateSchema>;

export interface MediaItem extends Timestamped {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  folder: MediaFolder;
  altText?: string;
  tags: string[];
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

/** Human-readable size, for a caption under a thumbnail. */
export const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Everything a search box should match on for one item. */
export const mediaSearchText = (item: MediaItem): string =>
  `${item.filename} ${item.altText ?? ''} ${item.tags.join(' ')} ${item.folder}`.toLowerCase();
