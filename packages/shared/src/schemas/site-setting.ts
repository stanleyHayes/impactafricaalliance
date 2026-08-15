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

/**
 * Countries where IAA has a presence, shown as chips on the Contact page.
 * Accepts a comma-separated string from the admin form and normalises to an
 * array so the public site never has to parse free text.
 */
const regionalPresenceSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    const list = typeof value === 'string' ? value.split(',') : (value ?? []);
    return list.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  });

export const siteSettingInputSchema = z.object({
  key: z.literal('site').default('site'),
  siteName: z.string().min(1).max(120),
  tagline: optionalShortText,
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1).max(50),
  whatsappPhone: optionalPhone,
  alternatePhone: optionalPhone,
  alternatePhoneLabel: optionalShortText,
  addressLine1: z.string().min(1).max(200),
  addressLine2: optionalShortText,
  city: z.string().min(1).max(100),
  region: optionalShortText,
  postalCode: optionalShortText,
  country: z.string().min(1).max(100),
  regionalPresence: regionalPresenceSchema,
  mapUrl: optionalUrl,
  socials: siteSettingSocialsSchema.optional(),
});

export const siteSettingUpdateSchema = siteSettingInputSchema
  .partial()
  .extend({ socials: siteSettingSocialsSchema.partial().optional() });

export type SiteSettingInput = z.infer<typeof siteSettingInputSchema>;
export type SiteSettingUpdate = z.infer<typeof siteSettingUpdateSchema>;

/**
 * Pre-parse shape accepted by the update schema. Differs from
 * `SiteSettingUpdate` only in that `regionalPresence` may still be the
 * comma-separated string an editor typed, so admin forms bind to this type.
 */
export type SiteSettingUpdateInput = z.input<typeof siteSettingUpdateSchema>;

export interface SiteSetting extends Timestamped {
  key: 'site';
  siteName: string;
  tagline?: string;
  contactEmail: string;
  contactPhone: string;
  /** WhatsApp number; falls back to `contactPhone` on the public site when unset. */
  whatsappPhone?: string;
  alternatePhone?: string;
  /** Country/office label for `alternatePhone`, e.g. "Nigeria". */
  alternatePhoneLabel?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
  regionalPresence?: string[];
  mapUrl?: string;
  socials?: SiteSettingSocials;
}
