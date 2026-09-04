import { z } from 'zod';

import { TEAM_TIERS, type TeamTier } from '../enums.js';

import { mediaAssetSchema, type Timestamped, type MediaAsset } from './common.js';

/** Profile links are all optional; the admin form submits '' for untouched ones. */
const optionalUrl = z
  .union([z.literal(''), z.string().url().max(500)])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const tierEnum = z.enum(TEAM_TIERS as [TeamTier, ...TeamTier[]]);

export const teamMemberInputSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  role: z.string().min(2).max(120).trim(),
  tier: tierEnum.default('executive'),
  bio: z.string().max(600).trim().optional(),
  photo: mediaAssetSchema.optional(),
  linkedInUrl: optionalUrl,
  xUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;

export const teamMemberUpdateSchema = teamMemberInputSchema.partial();
export type TeamMemberUpdate = z.infer<typeof teamMemberUpdateSchema>;

export interface TeamMember extends Timestamped {
  name: string;
  role: string;
  tier: TeamTier;
  bio?: string;
  photo?: MediaAsset;
  linkedInUrl?: string;
  xUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  order: number;
  isActive: boolean;
}
