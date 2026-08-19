import { z } from 'zod';

/** Post targets. Distinct from the API's SOCIAL_PLATFORMS (connected accounts: linkedin, meta, x). */
export const SOCIAL_POST_PLATFORMS = ['linkedin', 'facebook', 'instagram', 'x'] as const;

export type SocialPostPlatform = (typeof SOCIAL_POST_PLATFORMS)[number];

const optionalUrl = z.string().trim().url().optional().or(z.literal(''));

export const socialPostInputSchema = z.object({
  message: z.string().trim().min(1).max(3000),
  linkUrl: optionalUrl,
  imageUrl: optionalUrl,
  platforms: z.array(z.enum(SOCIAL_POST_PLATFORMS)).min(1).optional(),
});

export type SocialPostInput = z.infer<typeof socialPostInputSchema>;
