import { z } from 'zod';

import { mediaAssetSchema, type Timestamped, type MediaAsset } from './common.js';

export const partnerInputSchema = z.object({
  name: z.string().min(2).max(160).trim(),
  logo: mediaAssetSchema,
  websiteUrl: z.string().url().optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type PartnerInput = z.infer<typeof partnerInputSchema>;

export const partnerUpdateSchema = partnerInputSchema.partial();
export type PartnerUpdate = z.infer<typeof partnerUpdateSchema>;

export interface Partner extends Timestamped {
  name: string;
  logo: MediaAsset;
  websiteUrl?: string;
  order: number;
  isActive: boolean;
}
