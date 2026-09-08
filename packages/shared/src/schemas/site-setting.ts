import { z } from 'zod';

import { type Timestamped } from './common.js';
import { partialForUpdate } from './update.js';

// .optional() comes last on each of these so the inferred key is optional
// rather than required-and-possibly-undefined, which would force every caller
// to spell out fields it does not set.
const optionalShortText = z
  .string()
  .max(200)
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const optionalPhone = z
  .string()
  .max(50)
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const optionalUrl = z
  .union([z.literal(''), z.string().url().max(500)])
  .transform((value) => (value === '' ? undefined : value))
  .optional();

export const siteSettingSocialsSchema = z.object({
  facebook: optionalUrl,
  x: optionalUrl,
  instagram: optionalUrl,
  linkedin: optionalUrl,
  youtube: optionalUrl,
  tiktok: optionalUrl,
  /** Invite link to the WhatsApp community, not a number to message. */
  whatsapp: optionalUrl,
});

export type SiteSettingSocials = z.infer<typeof siteSettingSocialsSchema>;

/**
 * The personal links a team member can list, named by the field they live in
 * on the team record.
 */
export const TEAM_SOCIAL_FIELDS = [
  'linkedInUrl',
  'websiteUrl',
  'xUrl',
  'githubUrl',
  'instagramUrl',
  'facebookUrl',
  'tiktokUrl',
] as const;
export type TeamSocialField = (typeof TEAM_SOCIAL_FIELDS)[number];

/**
 * Which of a team member's own links the site shows.
 *
 * One setting for everyone rather than a switch per person: the decision is
 * about what the organisation puts its name next to, not about any individual,
 * and nobody wants to make it seventeen times.
 */
export const teamSocialsEnabledSchema = z
  .object(
    Object.fromEntries(TEAM_SOCIAL_FIELDS.map((field) => [field, z.boolean()])) as Record<
      TeamSocialField,
      z.ZodBoolean
    >,
  )
  .partial();
export type TeamSocialsEnabled = z.infer<typeof teamSocialsEnabledSchema>;

/**
 * What shows when nobody has said otherwise: LinkedIn alone.
 *
 * A colleague's personal X or TikTok is theirs, and linking it from a staff
 * page puts the organisation's name beside whatever is posted there. LinkedIn
 * is the one that is professional by default.
 */
export const DEFAULT_TEAM_SOCIALS_ENABLED: TeamSocialsEnabled = { linkedInUrl: true };

export const isTeamSocialEnabled = (
  enabled: TeamSocialsEnabled | undefined,
  field: TeamSocialField,
): boolean => (enabled?.[field] ?? DEFAULT_TEAM_SOCIALS_ENABLED[field]) === true;

/**
 * Site-wide announcement bar. Kept in site settings rather than hard-coded so a
 * launch notice can be edited or switched off from the dashboard without a
 * deploy, and so the copy outlives any one campaign.
 */
export const siteSettingAnnouncementSchema = z.object({
  enabled: z.boolean().optional().default(false),
  message: z
    .string()
    .max(300)
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  linkUrl: optionalUrl,
  linkLabel: optionalShortText,
});

export type SiteSettingAnnouncement = z.infer<typeof siteSettingAnnouncementSchema>;

/**
 * Welcome dialog shown on a visitor's first arrival. Separate from the
 * announcement bar: the bar is passive and always present, this interrupts.
 */
export const siteSettingPopupSchema = z.object({
  enabled: z.boolean().optional().default(false),
  title: optionalShortText,
  message: z
    .string()
    .max(600)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
  ctaLabel: optionalShortText,
  ctaUrl: optionalUrl,
  imageUrl: optionalUrl,
  /** Seconds to wait before showing, so it never lands mid-page-load. */
  delaySeconds: z.number().int().min(0).max(60).optional().default(2),
});

export type SiteSettingPopup = z.infer<typeof siteSettingPopupSchema>;

/**
 * Floating chat launcher. Routes to WhatsApp rather than a hosted widget:
 * the number already exists, it needs no third-party script or account, and
 * conversations land where the team already answers them.
 */
export const siteSettingLiveChatSchema = z.object({
  enabled: z.boolean().optional().default(false),
  label: optionalShortText,
  greeting: z
    .string()
    .max(300)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});

export type SiteSettingLiveChat = z.infer<typeof siteSettingLiveChatSchema>;

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
  teamSocialsEnabled: teamSocialsEnabledSchema.optional(),
  announcement: siteSettingAnnouncementSchema.optional(),
  popup: siteSettingPopupSchema.optional(),
  liveChat: siteSettingLiveChatSchema.optional(),
});

export const siteSettingUpdateSchema = partialForUpdate(siteSettingInputSchema).extend({
  socials: siteSettingSocialsSchema.partial().optional(),
  teamSocialsEnabled: teamSocialsEnabledSchema.optional(),
  announcement: siteSettingAnnouncementSchema.partial().optional(),
  popup: siteSettingPopupSchema.partial().optional(),
  liveChat: siteSettingLiveChatSchema.partial().optional(),
});

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
  teamSocialsEnabled?: TeamSocialsEnabled;
  announcement?: SiteSettingAnnouncement;
  popup?: SiteSettingPopup;
  liveChat?: SiteSettingLiveChat;
}
