import { ORG } from '../constants/content.js';

import type { PAGE_KEYS } from './page-setting.js';

/**
 * Every place on the public site that shows a fixed photograph, banner or
 * piece of artwork, and what it shows until someone replaces it.
 *
 * The list stays in code because each key is read by a named component: a
 * key nobody reads would be a picture uploaded into a void. Only the picture
 * behind a key is editable. Both apps read this one catalogue, so the console
 * can list every slot with the image it falls back to, and the site falls back
 * to exactly that image.
 */

/** The pages the console groups slots under, in the order the site's menu reads. */
export const SITE_IMAGE_PAGES = [
  { key: 'site', label: 'Across the site', path: '/' },
  { key: 'home', label: 'Home', path: '/' },
  { key: 'about', label: 'About', path: '/about' },
  { key: 'our-work', label: 'Our Work', path: '/our-work' },
  { key: 'impact', label: 'Impact', path: '/impact' },
  { key: 'get-involved', label: 'Get Involved', path: '/get-involved' },
  { key: 'news', label: 'News', path: '/news' },
  { key: 'events', label: 'Events', path: '/events' },
  { key: 'resources', label: 'Resources', path: '/resources' },
  { key: 'reviews', label: 'Reviews', path: '/reviews' },
  { key: 'contact', label: 'Contact', path: '/contact' },
] as const;

export type SiteImagePage = (typeof SITE_IMAGE_PAGES)[number];
export type SiteImagePageKey = SiteImagePage['key'];

export interface SiteImageSlot {
  key: string;
  /** What an editor calls it, e.g. "About — Page banner". */
  label: string;
  /** The page it is grouped under in the console. */
  page: SiteImagePageKey;
  /** The part of the page, e.g. "Page banner" or "Vision quote". */
  section: string;
  /** Where this appears, in the words an editor would use. */
  usage: string;
  /** Path on the public site where the result can be seen. */
  previewPath: string;
  /** Shape the site crops to, so the preview shows the real framing. */
  aspect: string;
  /**
   * The smallest upload that stays sharp here, in pixels. Banners are drawn
   * edge to edge on a wide screen, so anything narrower is stretched and
   * looks soft.
   */
  recommended: { width: number; height: number };
  /** The image shipped with the build, used until one is uploaded. */
  fallback: string;
  /**
   * Read aloud while the shipped image is shown. Empty for a decorative
   * slot, which screen readers skip.
   */
  defaultAlt: string;
  /**
   * Drawn as a background behind text, so no description is read aloud and
   * alt text would never be heard.
   */
  decorative?: boolean;
  /**
   * Another slot whose upload is used before this slot's own shipped image.
   *
   * The banners that used to share the "Default page banner" still do until
   * they are given their own, so a site that replaced the default keeps its
   * look. One level deep only, so a chain can never loop.
   */
  inherits?: string;
  /**
   * The Page Settings record whose hero image, when published, is shown in
   * place of this slot. Kept first for compatibility with pages set up there.
   */
  pageSetting?: (typeof PAGE_KEYS)[number];
}

/** A banner across the top of an inner page: full width, about 1440 × 500 on a laptop. */
const BANNER = { aspect: '21 / 9', recommended: { width: 2000, height: 860 } } as const;
/** A tall photograph beside text, or a portrait placeholder. */
const PORTRAIT = { aspect: '4 / 5', recommended: { width: 1200, height: 1500 } } as const;
/** A wide photograph in a mosaic. */
const WIDE = { aspect: '16 / 9', recommended: { width: 1600, height: 900 } } as const;

const COMMUNITY = '/images/community.webp';
const TEAM_ARTWORK = '/images/team-alliance-artwork.webp';

const SLOTS = [
  // Across the site
  {
    key: 'community',
    label: 'Default page banner',
    page: 'site',
    section: 'Page banners',
    usage:
      'The banner on any page without one of its own. News, Impact stories, Reviews, careers applications and articles without a cover use it until they are given their own.',
    previewPath: '/news',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
  },
  {
    key: 'social-share-default',
    label: 'Default link preview',
    page: 'site',
    section: 'Sharing',
    usage:
      'The picture shown when a page without its own image is shared on WhatsApp, LinkedIn, Facebook or X. Some apps keep a copy of the old picture for a few days.',
    previewPath: '/',
    aspect: '1200 / 630',
    recommended: { width: 1200, height: 630 },
    fallback: '/brand/og-image.png',
    defaultAlt: `${ORG.name} — ${ORG.tagline}`,
  },

  // Home
  {
    key: 'home-hero',
    label: 'Home — Hero, first slide',
    page: 'home',
    section: 'Hero',
    usage:
      'The large photograph behind the headline at the top of the home page. The other four slides are the programme photographs under Pillar Images.',
    previewPath: '/',
    aspect: '16 / 9',
    recommended: { width: 2400, height: 1350 },
    fallback: '/images/hero.webp',
    defaultAlt: 'Youth building practical digital skills',
    pageSetting: 'home',
  },
  {
    key: 'home-showcase-lead',
    label: 'Home — On the ground: Digital skills',
    page: 'home',
    section: '"The work looks like people" band',
    usage: 'The tall first photograph in the "The work looks like people" band.',
    previewPath: '/',
    ...PORTRAIT,
    fallback: '/images/home-showcase-lead-v2.webp',
    defaultAlt:
      'AI-generated illustration of young adults collaborating on digital skills at a laptop',
  },
  {
    key: 'home-showcase-women',
    label: 'Home — On the ground: Women leading',
    page: 'home',
    section: '"The work looks like people" band',
    usage: 'The second photograph in the "The work looks like people" band.',
    previewPath: '/',
    ...WIDE,
    fallback: '/images/home-showcase-women-v2.webp',
    defaultAlt:
      'AI-generated illustration of women entrepreneurs reviewing textiles and business plans',
  },
  {
    key: 'home-showcase-work',
    label: 'Home — On the ground: Career Launchpad',
    page: 'home',
    section: '"The work looks like people" band',
    usage: 'The third photograph in the "The work looks like people" band.',
    previewPath: '/',
    ...WIDE,
    fallback: '/images/home-showcase-work-v2.webp',
    defaultAlt: 'AI-generated illustration of young professionals working with a workplace coach',
  },
  {
    key: 'home-vision-band',
    label: 'Home — Vision quote background',
    page: 'home',
    section: 'Vision quote',
    usage: 'The photograph behind the vision quote near the foot of the home page.',
    previewPath: '/',
    ...BANNER,
    fallback: '/images/program-women-empowerment.webp',
    defaultAlt: '',
    decorative: true,
  },

  // About
  {
    key: 'about-hero',
    label: 'About — Page banner',
    page: 'about',
    section: 'Page banner',
    usage: 'The banner across the top of the About page.',
    previewPath: '/about',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
    pageSetting: 'about',
  },
  {
    key: 'about-intro',
    label: 'About — Who we are',
    page: 'about',
    section: 'Who we are',
    usage: 'The tall photograph beside the "Who we are" introduction on the About page.',
    previewPath: '/about',
    aspect: '3 / 4',
    recommended: { width: 1200, height: 1600 },
    fallback: COMMUNITY,
    defaultAlt: 'Impact Africa Alliance community gathering',
  },
  {
    key: 'team-artwork',
    label: 'Team — Portrait placeholder',
    page: 'about',
    section: 'Team',
    usage:
      'Stands in for a team member with no portrait yet, on the About page, in the team dialog and on team profiles. Events without an image use it too until they are given their own artwork.',
    previewPath: '/about#team',
    ...PORTRAIT,
    fallback: TEAM_ARTWORK,
    defaultAlt: '',
    decorative: true,
  },

  // Our Work
  {
    key: 'our-work-hero',
    label: 'Our Work — Page banner',
    page: 'our-work',
    section: 'Page banner',
    usage:
      'The banner across the top of the Our Work page. Each programme page uses its own photograph from Pillar Images.',
    previewPath: '/our-work',
    ...BANNER,
    fallback: '/images/program-digital-skills.webp',
    defaultAlt: '',
    decorative: true,
    pageSetting: 'our-work',
  },

  // Impact
  {
    key: 'impact-banner',
    label: 'Impact — Page banner',
    page: 'impact',
    section: 'Page banner',
    usage: 'The banner across the top of the Impact page.',
    previewPath: '/impact',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
    pageSetting: 'impact',
  },
  {
    key: 'impact-voices-band',
    label: 'Impact — Voices background',
    page: 'impact',
    section: 'Voices of Change',
    usage: 'The photograph behind the quotes band on the Impact page.',
    previewPath: '/impact',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
  },
  {
    key: 'impact-stories-hero',
    label: 'Impact stories — Page banner',
    page: 'impact',
    section: 'Impact stories',
    usage: 'The banner across the top of the Impact stories list.',
    previewPath: '/impact/stories',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
    inherits: 'community',
  },

  // Get Involved
  {
    key: 'get-involved-hero',
    label: 'Get Involved — Page banner',
    page: 'get-involved',
    section: 'Page banner',
    usage: 'The banner across the top of the Get Involved page.',
    previewPath: '/get-involved',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
    pageSetting: 'get-involved',
  },
  {
    key: 'get-involved-partner',
    label: 'Get Involved — Partner',
    page: 'get-involved',
    section: '"Every route in changes something" band',
    usage: 'The tall first photograph in the "Every route in changes something" band.',
    previewPath: '/get-involved',
    ...PORTRAIT,
    fallback: '/images/get-involved-partner-v2.webp',
    defaultAlt: 'AI-generated illustration of colleagues planning an education partnership',
  },
  {
    key: 'get-involved-mentor',
    label: 'Get Involved — Mentor',
    page: 'get-involved',
    section: '"Every route in changes something" band',
    usage: 'The second photograph in the "Every route in changes something" band.',
    previewPath: '/get-involved',
    ...WIDE,
    fallback: '/images/get-involved-mentor-v2.webp',
    defaultAlt: 'AI-generated illustration of a mentor guiding an adult learner at a laptop',
  },
  {
    key: 'get-involved-give',
    label: 'Get Involved — Give',
    page: 'get-involved',
    section: '"Every route in changes something" band',
    usage: 'The third photograph in the "Every route in changes something" band.',
    previewPath: '/get-involved',
    ...WIDE,
    fallback: '/images/get-involved-give-v2.webp',
    defaultAlt:
      'AI-generated illustration of a learner receiving a laptop from an education coordinator',
  },
  {
    key: 'careers-apply-hero',
    label: 'Careers — Application banner',
    page: 'get-involved',
    section: 'Careers',
    usage: 'The banner across the top of every job application page.',
    previewPath: '/get-involved#careers',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
    inherits: 'community',
  },

  // News
  {
    key: 'news-hero',
    label: 'News — Page banner',
    page: 'news',
    section: 'Page banner',
    usage: 'The banner across the top of the News page.',
    previewPath: '/news',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
    inherits: 'community',
    pageSetting: 'news',
  },
  {
    key: 'news-article-fallback',
    label: 'News — Article banner without a cover',
    page: 'news',
    section: 'Articles',
    usage:
      'The banner at the top of an article that has no cover image of its own. An article with a cover always shows its cover.',
    previewPath: '/news',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
    inherits: 'community',
  },

  // Events
  {
    key: 'events-hero',
    label: 'Events — Page banner',
    page: 'events',
    section: 'Page banner',
    usage: 'The banner across the top of the Events page.',
    previewPath: '/events',
    ...BANNER,
    fallback: TEAM_ARTWORK,
    defaultAlt: '',
    decorative: true,
    pageSetting: 'events',
  },
  {
    key: 'event-artwork',
    label: 'Events — Artwork for events without an image',
    page: 'events',
    section: 'Event cards',
    usage:
      'Stands in for an event with no image of its own, on the event cards, the calendar and the event page. An event with its own image always shows it.',
    previewPath: '/events',
    ...PORTRAIT,
    fallback: TEAM_ARTWORK,
    defaultAlt: '',
    decorative: true,
    inherits: 'team-artwork',
  },

  // Resources
  {
    key: 'resources-banner',
    label: 'Resources — Page banner',
    page: 'resources',
    section: 'Page banner',
    usage: 'The banner across the top of the Resources page.',
    previewPath: '/resources',
    ...BANNER,
    fallback: '/images/program-stem-learning.webp',
    defaultAlt: '',
    decorative: true,
  },

  // Reviews
  {
    key: 'reviews-hero',
    label: 'Reviews — Page banner',
    page: 'reviews',
    section: 'Page banner',
    usage: 'The banner across the top of the Reviews page.',
    previewPath: '/reviews',
    ...BANNER,
    fallback: COMMUNITY,
    defaultAlt: '',
    decorative: true,
    inherits: 'community',
  },

  // Contact
  {
    key: 'contact-hero',
    label: 'Contact — Page banner',
    page: 'contact',
    section: 'Page banner',
    usage: 'The tall banner across the top of the Contact page, behind the headline.',
    previewPath: '/contact',
    aspect: '16 / 9',
    recommended: { width: 2000, height: 1125 },
    fallback: '/images/program-stem-learning.webp',
    defaultAlt: '',
    decorative: true,
    pageSetting: 'contact',
  },
] as const satisfies readonly SiteImageSlot[];

/** A key a component on the site reads. Typed, so a misspelt slot fails the build. */
export type SiteImageKey = (typeof SLOTS)[number]['key'];

export const SITE_IMAGE_SLOTS: readonly SiteImageSlot[] = SLOTS;

export const SITE_IMAGE_KEYS: readonly SiteImageKey[] = SLOTS.map((slot) => slot.key);

/** What a page shows when asked for a slot the catalogue does not have. */
export const SITE_IMAGE_DEFAULT_FALLBACK = COMMUNITY;

export const isSiteImageKey = (key: string): key is SiteImageKey =>
  (SITE_IMAGE_KEYS as readonly string[]).includes(key);

export const siteImageSlot = (key: string): SiteImageSlot | undefined =>
  SITE_IMAGE_SLOTS.find((slot) => slot.key === key);

export const siteImagePage = (key: SiteImagePageKey): SiteImagePage =>
  SITE_IMAGE_PAGES.find((page) => page.key === key) ?? SITE_IMAGE_PAGES[0];

/** Every slot, grouped by the page it belongs to, in menu order. Pages with no slots are left out. */
export const siteImageSlotsByPage = (
  slots: readonly SiteImageSlot[] = SITE_IMAGE_SLOTS,
): { page: SiteImagePage; slots: SiteImageSlot[] }[] =>
  SITE_IMAGE_PAGES.map((page) => ({
    page,
    slots: slots.filter((slot) => slot.page === page.key),
  })).filter((group) => group.slots.length > 0);

/** The slots that fall back to this one's upload, e.g. the banners sharing the default. */
export const siteImageDependants = (key: string): SiteImageSlot[] =>
  SITE_IMAGE_SLOTS.filter((slot) => slot.inherits === key);
