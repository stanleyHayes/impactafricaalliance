/**
 * The programme photographs shipped with the build: what Pillar Images falls
 * back to until a photograph is uploaded for a programme.
 *
 * Every other fixed picture on the site — banners, the home hero, the
 * placeholder artwork — is a slot in the shared catalogue (`SITE_IMAGE_SLOTS`
 * in `@iaa/shared`), read through `lib/site-images` and replaced from the
 * dashboard's Site images page. Add new fixed pictures there, not here.
 */
export const IMAGES = {
  community: '/images/community.webp',
  programs: {
    'digital-skills': '/images/program-digital-skills.webp',
    'stem-learning': '/images/program-stem-learning.webp',
    // TODO: replace with dedicated Career Launchpad photography once shot.
    'youth-inclusion': '/images/community.webp',
    'women-empowerment': '/images/program-women-empowerment.webp',
  },
} as const;

export type ProgramImageKey = keyof typeof IMAGES.programs;

export const programImage = (key: string): string =>
  (IMAGES.programs as Record<string, string>)[key] ?? IMAGES.community;
