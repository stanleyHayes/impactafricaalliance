import { SITE_IMAGE_PAGES, SITE_IMAGE_SLOTS, type SiteImage } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import {
  aspectLabel,
  buildSiteImageBoard,
  filterBoard,
  isUndersized,
  slotRecord,
  thumbnailUrl,
  type SlotView,
} from './site-images';

const UPLOAD = 'https://res.cloudinary.com/demo/image/upload/v1/site/upload.jpg';

const record = (key: string, overrides: Partial<SiteImage> = {}): SiteImage => ({
  id: `id-${key}`,
  key,
  image: { url: UPLOAD, publicId: 'site/upload' },
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const find = (board: ReturnType<typeof buildSiteImageBoard>, key: string): SlotView => {
  const view = board.flatMap((group) => group.slots).find((entry) => entry.slot.key === key);
  if (!view) throw new Error(`No slot ${key}`);
  return view;
};

describe('the site images board', () => {
  it('lists every slot once, under its page, in the site’s menu order', () => {
    const board = buildSiteImageBoard([]);
    expect(board.flatMap((group) => group.slots)).toHaveLength(SITE_IMAGE_SLOTS.length);
    const order = SITE_IMAGE_PAGES.map((page) => page.key as string);
    const pages = board.map((group) => group.page.key as string);
    expect(pages).toEqual([...pages].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    expect(pages[0]).toBe('site');
  });

  it('shows the shipped picture as the default until something is uploaded', () => {
    const view = find(buildSiteImageBoard([]), 'contact-hero');
    expect(view.status).toBe('original');
    expect(view.resolved.src).toBe('/images/program-stem-learning.webp');
    expect(view.record).toBeUndefined();
  });

  it('tells a replaced slot, a slot sharing the default banner and a switched-off one apart', () => {
    const board = buildSiteImageBoard([
      record('about-hero'),
      record('community'),
      record('reviews-hero', { isActive: false }),
    ]);
    expect(find(board, 'about-hero').status).toBe('replaced');
    expect(find(board, 'news-hero')).toMatchObject({
      status: 'shared',
      resolved: { inheritedFrom: { key: 'community' } },
    });
    // Its own record is switched off, so it shares the default banner again,
    // but the record is kept so that replacing edits it rather than adding one.
    const reviews = find(board, 'reviews-hero');
    expect(reviews.status).toBe('shared');
    expect(reviews.record?.id).toBe('id-reviews-hero');
  });

  it('edits the live record when a slot somehow has two', () => {
    const records = [
      record('home-hero', { id: 'old', isActive: false }),
      record('home-hero', { id: 'live' }),
    ];
    expect(slotRecord('home-hero', records)?.id).toBe('live');
  });

  it('flags a published Page Settings hero image that the site shows instead', () => {
    const board = buildSiteImageBoard(
      [],
      [
        { id: 'ps-about', pageKey: 'about', status: 'published', heroImage: { url: UPLOAD } },
        { id: 'ps-events', pageKey: 'events', status: 'draft', heroImage: { url: UPLOAD } },
      ],
    );
    expect(find(board, 'about-hero').pageSettingOverride).toEqual({ id: 'ps-about', url: UPLOAD });
    expect(find(board, 'events-hero').pageSettingOverride).toBeUndefined();
    // Resources has never honoured its Page Settings image, so nothing is flagged there.
    expect(find(board, 'resources-banner').pageSettingOverride).toBeUndefined();
  });
});

describe('narrowing the board', () => {
  const board = buildSiteImageBoard([record('about-hero')]);

  it('finds slots by page, section or where they appear, and drops empty pages', () => {
    const result = filterBoard(board, { query: 'vision quote', status: 'all', page: 'all' });
    expect(result.map((group) => group.page.key)).toEqual(['home']);
    expect(result[0]?.slots.map((view) => view.slot.key)).toEqual(['home-vision-band']);
  });

  it('shows only what has been replaced, or only one page', () => {
    const replaced = filterBoard(board, { query: '', status: 'replaced', page: 'all' });
    expect(replaced.flatMap((group) => group.slots.map((view) => view.slot.key))).toEqual([
      'about-hero',
    ]);
    const contact = filterBoard(board, { query: '', status: 'all', page: 'contact' });
    expect(contact.map((group) => group.page.key)).toEqual(['contact']);
  });
});

describe('picture guidance', () => {
  const banner = SITE_IMAGE_SLOTS.find((slot) => slot.key === 'about-hero')!;

  it('writes the shape as editors read it', () => {
    expect(aspectLabel(banner)).toBe('21:9');
  });

  it('warns about a picture too small for the slot, and not about one of unknown size', () => {
    expect(isUndersized(banner, { url: UPLOAD, publicId: 'a', width: 1200, height: 800 })).toBe(
      true,
    );
    expect(isUndersized(banner, { url: UPLOAD, publicId: 'a', width: 2400, height: 1030 })).toBe(
      false,
    );
    expect(isUndersized(banner, { url: UPLOAD, publicId: 'a' })).toBe(false);
  });

  it('asks Cloudinary for a card-sized copy, and leaves other addresses alone', () => {
    expect(thumbnailUrl(UPLOAD)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_720/v1/site/upload.jpg',
    );
    expect(thumbnailUrl('https://example.org/a.jpg')).toBe('https://example.org/a.jpg');
  });
});
