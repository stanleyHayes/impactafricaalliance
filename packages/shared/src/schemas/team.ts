import { z } from 'zod';

import { TEAM_COUNTRY_CODES, type TeamCountryCode } from '../constants/countries.js';
import { TEAM_TIERS, TeamTier as TeamTiers, type TeamTier } from '../enums.js';

import { mediaAssetSchema, type Timestamped, type MediaAsset } from './common.js';
import { partialForUpdate } from './update.js';

/** Profile links are all optional; the admin form submits '' for untouched ones. */
const optionalUrl = z
  .union([z.literal(''), z.string().url().max(500)])
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const tierEnum = z.enum(TEAM_TIERS as [TeamTier, ...TeamTier[]]);

const countryEnum = z.enum(
  TEAM_COUNTRY_CODES as unknown as [TeamCountryCode, ...TeamCountryCode[]],
);

/** The admin form sends '' for an untouched country; that means "none". */
const optionalCountry = z
  .union([z.literal(''), countryEnum])
  .transform((value) => (value === '' ? undefined : value))
  .optional();

/** Ambassadors represent the alliance in a country, so the website always names it. */
export const AMBASSADOR_COUNTRY_MESSAGE = 'Choose the country this ambassador represents.';

/** True when a member needs a country but has none. Shared by the form and the API's edit check. */
export const teamCountryMissing = (member: { tier?: TeamTier; country?: string | null }): boolean =>
  member.tier === TeamTiers.Ambassador && !member.country;

const teamMemberShape = z.object({
  name: z.string().min(2).max(120).trim(),
  role: z.string().min(2).max(120).trim(),
  tier: tierEnum.default('executive'),
  /** Shown under the name on the website; required for ambassadors. */
  country: optionalCountry,
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

export const teamMemberInputSchema = teamMemberShape.superRefine((member, ctx) => {
  if (teamCountryMissing(member)) {
    ctx.addIssue({ code: 'custom', path: ['country'], message: AMBASSADOR_COUNTRY_MESSAGE });
  }
});
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;

/**
 * Built from the plain shape: an edit that only changes the order must not
 * fail the ambassador rule, which the API checks against the whole record.
 * `null` or '' clears the country.
 */
export const teamMemberUpdateSchema = partialForUpdate(teamMemberShape).extend({
  country: z
    .union([z.literal(''), z.null(), countryEnum])
    .transform((value) => (value === '' ? null : value))
    .optional(),
});
export type TeamMemberUpdate = z.infer<typeof teamMemberUpdateSchema>;

export interface TeamMember extends Timestamped {
  name: string;
  role: string;
  tier: TeamTier;
  /** ISO 3166-1 alpha-2 code, e.g. 'GH'. */
  country?: string | null;
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
