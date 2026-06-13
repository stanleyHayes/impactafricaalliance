import { z } from 'zod';

/** A 24-character hex MongoDB ObjectId, validated as a string on the wire. */
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier');

/** A Cloudinary asset reference attached to content. */
export const mediaAssetSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  alt: z.string().max(300).optional(),
});
export type MediaAsset = z.infer<typeof mediaAssetSchema>;

/** Standard pagination query accepted by list endpoints. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Shape of every error body returned by the API. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(slugRegex, 'Slug must be lowercase words separated by single hyphens');

/** Audit timestamps present on every persisted document returned to clients. */
export interface Timestamped {
  id: string;
  createdAt: string;
  updatedAt: string;
}
