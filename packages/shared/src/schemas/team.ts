import { z } from 'zod';

import { TEAM_TIERS, type TeamTier } from '../enums.js';

import { mediaAssetSchema, type Timestamped, type MediaAsset } from './common.js';
import { partialForUpdate } from './update.js';

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
  // Real biographies run well past 600 characters — several supplied ones are
  // over 1,700 — and the old cap meant those members could not be saved from
  // the dashboard at all.
  bio: z.string().max(5000).trim().optional(),
  photo: mediaAssetSchema.optional(),
  linkedInUrl: optionalUrl,
  xUrl: optionalUrl,
  /** Personal portfolio or company site. */
  websiteUrl: optionalUrl,
  githubUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;

export const teamMemberUpdateSchema = partialForUpdate(teamMemberInputSchema);
export type TeamMemberUpdate = z.infer<typeof teamMemberUpdateSchema>;

export interface TeamMember extends Timestamped {
  name: string;
  role: string;
  tier: TeamTier;
  bio?: string;
  photo?: MediaAsset;
  linkedInUrl?: string;
  xUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  order: number;
  isActive: boolean;
}
