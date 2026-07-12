import { z } from 'zod';

import { type Timestamped } from './common.js';

const optionalShortText = z
  .string()
  .max(200)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const optionalPhone = z
  .string()
  .max(50)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const optionalUrl = z
  .union([z.literal(''), z.string().url().max(500)])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

export const siteSettingSocialsSchema = z.object({
  facebook: optionalUrl,
  x: optionalUrl,
  instagram: optionalUrl,
  linkedin: optionalUrl,
  youtube: optionalUrl,
  tiktok: optionalUrl,
});

export type SiteSettingSocials = z.infer<typeof siteSettingSocialsSchema>;

export const siteSettingInputSchema = z.object({
  key: z.literal('site').default('site'),
  siteName: z.string().min(1).max(120),
  tagline: optionalShortText,
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1).max(50),
  alternatePhone: optionalPhone,
  addressLine1: z.string().min(1).max(200),
  addressLine2: optionalShortText,
  city: z.string().min(1).max(100),
  region: optionalShortText,
  postalCode: optionalShortText,
  country: z.string().min(1).max(100),
  mapUrl: optionalUrl,
  socials: siteSettingSocialsSchema.optional(),
});

export const siteSettingUpdateSchema = siteSettingInputSchema
  .partial()
  .extend({ socials: siteSettingSocialsSchema.partial().optional() });

export type SiteSettingInput = z.infer<typeof siteSettingInputSchema>;
export type SiteSettingUpdate = z.infer<typeof siteSettingUpdateSchema>;

export interface SiteSetting extends Timestamped {
  key: 'site';
  siteName: string;
  tagline?: string;
  contactEmail: string;
  contactPhone: string;
  alternatePhone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
  mapUrl?: string;
  socials?: SiteSettingSocials;
}
