import { z } from 'zod';

import type { Timestamped } from './common.js';

const optionalText = z
  .string()
  .max(200)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const optionalUrl = z
  .union([z.literal(''), z.string().url().max(500)])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

/**
 * A physical location. Kept as its own collection rather than fields on site
 * settings so the organisation can add as many offices as it opens, each with
 * its own contact details, without a schema change.
 */
export const officeInputSchema = z.object({
  label: z.string().min(2).max(120).trim(),
  addressLine1: z.string().min(2).max(200).trim(),
  addressLine2: optionalText,
  city: optionalText,
  region: optionalText,
  postalCode: optionalText,
  country: z.string().min(2).max(100).trim(),
  phone: z.string().max(50).optional().transform((value) => (value === '' ? undefined : value)),
  email: z
    .union([z.literal(''), z.string().email().max(200)])
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  mapUrl: optionalUrl,
  /** The address shown in the footer and used for schema.org markup. */
  isPrimary: z.boolean().optional().default(false),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type OfficeInput = z.infer<typeof officeInputSchema>;

export const officeUpdateSchema = officeInputSchema.partial();
export type OfficeUpdate = z.infer<typeof officeUpdateSchema>;

export interface Office extends Timestamped {
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
  mapUrl?: string;
  isPrimary: boolean;
  order: number;
  isActive: boolean;
}

/** Single-line rendering used by the footer, cards, and schema.org output. */
export const formatOfficeAddress = (office: Office): string =>
  [office.addressLine1, office.addressLine2, office.city, office.region, office.country]
    .filter(Boolean)
    .join(', ');
