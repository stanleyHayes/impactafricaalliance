import { z } from 'zod';

import { mediaAssetSchema, type Timestamped, type MediaAsset } from './common.js';
import { partialForUpdate } from './update.js';

/** The admin form submits '' for an emptied link; that means "none", not an invalid URL. */
const optionalUrl = z
  .union([z.literal(''), z.string().url().max(500)])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const partnerInputSchema = z.object({
  name: z.string().min(2).max(160).trim(),
  logo: mediaAssetSchema,
  websiteUrl: optionalUrl,
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type PartnerInput = z.infer<typeof partnerInputSchema>;

export const partnerUpdateSchema = partialForUpdate(partnerInputSchema);
export type PartnerUpdate = z.infer<typeof partnerUpdateSchema>;

export interface Partner extends Timestamped {
  name: string;
  logo: MediaAsset;
  websiteUrl?: string;
  order: number;
  isActive: boolean;
}
