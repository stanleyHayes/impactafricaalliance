import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PAGE_KEYS } from './page-setting.js';
import {
  isSiteImageKey,
  SITE_IMAGE_PAGES,
  SITE_IMAGE_SLOTS,
  siteImageDependants,
  siteImageSlot,
  siteImageSlotsByPage,
} from './site-image-slots.js';
import {
  resolveSiteImage,
  siteImageInputSchema,
  siteImageMap,
  siteImageUpdateSchema,
  type SiteImage,
} from './site-image.js';

/** The marketing site's static files, where every shipped default must exist. */
const MARKETING_PUBLIC = fileURLToPath(
  new URL('../../../../apps/marketing/public', import.meta.url),
);

/** Keys that production already has records under; renaming one orphans its upload. */
const KEYS_IN_USE = [
  'home-hero',
  'impact-banner',
  'community',
  'team-artwork',
  'about-intro',
  'home-showcase-lead',
  'home-showcase-women',
  'home-showcase-work',
  'home-vision-band',
  'get-involved-partner',
  'get-involved-mentor',
  'get-involved-give',
  'resources-banner',
  'impact-voices-band',
];

const record = (key: string, overrides: Partial<SiteImage> = {}): SiteImage => ({
  id: `id-${key}`,
  key,
  image: { url: `https://res.cloudinary.com/demo/image/upload/v1/${key}.jpg`, publicId: key },
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const ratio = (aspect: string): number => {
  const [width, height] = aspect.split('/').map((part) => Number(part.trim()));
  return (width ?? 0) / (height ?? 1);
};

describe('the site image catalogue', () => {
  it('gives every slot a unique key', () => {
    const keys = SITE_IMAGE_SLOTS.map((slot) => slot.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps every key production already has uploads under', () => {
    for (const key of KEYS_IN_USE) expect(isSiteImageKey(key)).toBe(true);
  });

  it('ships a default for every slot that exists in the marketing build, or is a full address', () => {
    for (const slot of SITE_IMAGE_SLOTS) {
      if (slot.fallback.startsWith('/')) {
        expect(existsSync(`${MARKETING_PUBLIC}${slot.fallback}`), slot.key).toBe(true);
      } else {
        expect(() => new URL(slot.fallback), slot.key).not.toThrow();
      }
    }
  });

  it('files every slot under a known page, and lists each exactly once', () => {
    const pageKeys = SITE_IMAGE_PAGES.map((page) => page.key as string);
    for (const slot of SITE_IMAGE_SLOTS) expect(pageKeys, slot.key).toContain(slot.page);
    const grouped = siteImageSlotsByPage().flatMap((group) => group.slots.map((slot) => slot.key));
    expect(grouped.sort()).toEqual(SITE_IMAGE_SLOTS.map((slot) => slot.key).sort());
  });

  it('recommends a size in the shape the site crops to', () => {
    for (const slot of SITE_IMAGE_SLOTS) {
      const recommended = slot.recommended.width / slot.recommended.height;
      expect(Math.abs(recommended / ratio(slot.aspect) - 1), slot.key).toBeLessThan(0.02);
    }
  });

  it('describes every picture that is read aloud, and none that is decorative', () => {
    for (const slot of SITE_IMAGE_SLOTS) {
      if (slot.decorative) expect(slot.defaultAlt, slot.key).toBe('');
      else expect(slot.defaultAlt.length, slot.key).toBeGreaterThan(10);
    }
  });

  it('only inherits from a real slot that inherits from nothing, so a chain cannot loop', () => {
    for (const slot of SITE_IMAGE_SLOTS.filter((entry) => entry.inherits)) {
      const parent = siteImageSlot(slot.inherits ?? '');
      expect(parent, slot.key).toBeDefined();
      expect(parent?.inherits, slot.key).toBeUndefined();
    }
    expect(siteImageDependants('community').map((slot) => slot.key)).toEqual(
      expect.arrayContaining(['news-hero', 'reviews-hero', 'news-article-fallback']),
    );
  });

  it('names only Page Settings pages that exist', () => {
    for (const slot of SITE_IMAGE_SLOTS.filter((entry) => entry.pageSetting)) {
      expect(PAGE_KEYS, slot.key).toContain(slot.pageSetting);
    }
  });
});

describe('site image records', () => {
  const image = { url: 'https://res.cloudinary.com/demo/image/upload/v1/a.jpg', publicId: 'a' };

  it('accepts a slot from the catalogue and refuses one that nothing reads', () => {
    expect(siteImageInputSchema.safeParse({ key: 'about-hero', image }).success).toBe(true);
    const unknown = siteImageInputSchema.safeParse({ key: 'about-herro', image });
    expect(unknown.success).toBe(false);
    expect(unknown.error?.issues[0]?.message).toMatch(/places the site shows an image/);
  });

  it('checks the key on an update too, without resetting what was not sent', () => {
    expect(siteImageUpdateSchema.safeParse({ key: 'nowhere' }).success).toBe(false);
    expect(siteImageUpdateSchema.parse({ alt: 'A crowd' })).toEqual({ alt: 'A crowd' });
  });

  it('accepts only an https picture, which a page can draw without warnings or script', () => {
    for (const url of [
      'http://res.cloudinary.com/demo/image/upload/v1/a.jpg',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'https://user@res.cloudinary.com/demo/image/upload/v1/a.jpg',
    ]) {
      const result = siteImageInputSchema.safeParse({
        key: 'about-hero',
        image: { ...image, url },
      });
      expect(result.success, url).toBe(false);
    }
    expect(
      siteImageUpdateSchema.safeParse({ image: { ...image, url: 'http://a.test/b.jpg' } }).success,
    ).toBe(false);
  });

  it('refuses alt text longer than a screen reader should read', () => {
    expect(
      siteImageInputSchema.safeParse({ key: 'about-intro', image, alt: 'a'.repeat(301) }).success,
    ).toBe(false);
  });

  it('turns an emptied description into a clear rather than a no-op', () => {
    expect(siteImageUpdateSchema.parse({ alt: '' })).toEqual({ alt: null });
    expect(siteImageUpdateSchema.parse({ alt: '  ' })).toEqual({ alt: null });
  });

  it('maps only live uploads, so switching one off restores the shipped image', () => {
    const items = [record('home-hero'), record('about-hero', { isActive: false })];
    expect(Object.keys(siteImageMap(items))).toEqual(['home-hero']);
  });
});

describe('resolving a slot', () => {
  it('draws the shipped image and its description with nothing uploaded', () => {
    expect(resolveSiteImage('about-intro')).toEqual({
      key: 'about-intro',
      src: '/images/community.webp',
      alt: 'Impact Africa Alliance community gathering',
      source: 'default',
    });
  });

  it('draws an upload with the editor’s description, then the library’s', () => {
    const upload = record('about-intro', { alt: 'Volunteers at a workshop' });
    expect(resolveSiteImage('about-intro', [upload])).toMatchObject({
      src: upload.image.url,
      alt: 'Volunteers at a workshop',
      source: 'upload',
    });
    const libraryOnly = record('about-intro', {
      alt: null,
      image: { ...upload.image, alt: 'From the library' },
    });
    expect(resolveSiteImage('about-intro', [libraryOnly]).alt).toBe('From the library');
  });

  it('borrows the default banner’s upload before falling back to its own file', () => {
    const shared = record('community');
    expect(resolveSiteImage('news-hero', [shared])).toMatchObject({
      src: shared.image.url,
      source: 'inherited',
      inheritedFrom: { key: 'community' },
    });
    const own = record('news-hero');
    expect(resolveSiteImage('news-hero', [shared, own]).src).toBe(own.image.url);
  });

  it('does not borrow for a banner that never shared the default', () => {
    expect(resolveSiteImage('about-hero', [record('community')]).source).toBe('default');
  });

  it('ignores a switched-off upload', () => {
    const off = record('reviews-hero', { isActive: false });
    expect(resolveSiteImage('reviews-hero', [off]).source).toBe('default');
  });

  it('falls back to the community photograph for a key it does not know', () => {
    expect(resolveSiteImage('not-a-slot').src).toBe('/images/community.webp');
  });
});
