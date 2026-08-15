/**
 * Marketing photography catalogue. Web-optimised assets in /public/images,
 * generated as documentary-style imagery aligned with the brand brief
 * (authentic African youth, women, and communities). Swap for owned/Cloudinary
 * assets in production via this one module.
 */
export const IMAGES = {
  hero: '/images/hero.webp',
  community: '/images/community.webp',
  programs: {
    'digital-skills': '/images/program-digital-skills.webp',
    'stem-learning': '/images/program-stem-learning.webp',
    // TODO: replace with dedicated Ready for Work photography once shot.
    'youth-inclusion': '/images/community.webp',
    'women-empowerment': '/images/program-women-empowerment.webp',
  },
} as const;

export type ProgramImageKey = keyof typeof IMAGES.programs;

export const programImage = (key: string): string =>
  (IMAGES.programs as Record<string, string>)[key] ?? IMAGES.community;
