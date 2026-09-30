import { describe, expect, it } from 'vitest';

import {
  announcementInputSchema,
  currentCampaign,
  isLive,
  sitePopupInputSchema,
  sitePopupUpdateSchema,
} from './campaign.js';

const at = (iso: string): Date => new Date(iso);
const now = at('2026-09-08T12:00:00Z');

const banner = (overrides: Record<string, unknown> = {}) =>
  ({
    isActive: true,
    priority: 0,
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }) as Parameters<typeof isLive>[0];

describe('whether a campaign is live', () => {
  it('is not live while switched off, whatever its dates say', () => {
    expect(isLive(banner({ isActive: false }), now)).toBe(false);
  });

  it('is live when switched on with no dates at all', () => {
    expect(isLive(banner(), now)).toBe(true);
  });

  it('waits for its start date', () => {
    expect(isLive(banner({ startsAt: '2026-10-08T09:00:00Z' }), now)).toBe(false);
  });

  it('stops at its end date', () => {
    expect(isLive(banner({ endsAt: '2026-09-08T11:00:00Z' }), now)).toBe(false);
  });

  it('runs inside its window', () => {
    expect(
      isLive(banner({ startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-09-30T00:00:00Z' }), now),
    ).toBe(true);
  });
});

describe('which campaign shows when several are live', () => {
  it('takes the highest priority', () => {
    const chosen = currentCampaign(
      [banner({ priority: 1, name: 'low' }), banner({ priority: 9, name: 'high' })],
      now,
    );

    // Promoting one over the others is a number, not a scramble to switch
    // every other banner off.
    expect((chosen as { name: string }).name).toBe('high');
  });

  it('breaks a tie on the most recently edited', () => {
    const chosen = currentCampaign(
      [
        banner({ priority: 5, updatedAt: '2026-09-01T00:00:00Z', name: 'older' }),
        banner({ priority: 5, updatedAt: '2026-09-07T00:00:00Z', name: 'newer' }),
      ],
      now,
    );

    expect((chosen as { name: string }).name).toBe('newer');
  });

  it('ignores one that has not started, however high its priority', () => {
    const chosen = currentCampaign(
      [
        banner({ priority: 1, name: 'running' }),
        banner({ priority: 99, startsAt: '2026-10-08T00:00:00Z', name: 'queued' }),
      ],
      now,
    );

    expect((chosen as { name: string }).name).toBe('running');
  });

  it('returns nothing when none are live', () => {
    expect(currentCampaign([banner({ isActive: false })], now)).toBeUndefined();
  });
});

describe('what a banner will accept', () => {
  it('is switched off unless someone says otherwise', () => {
    const parsed = announcementInputSchema.parse({ name: 'Draft', message: 'Coming soon' });

    // A banner is usually written before it is wanted; one appearing the
    // moment it is saved is the wrong surprise.
    expect(parsed.isActive).toBe(false);
  });

  it('refuses a link that is not a URL', () => {
    const result = announcementInputSchema.safeParse({
      name: 'Draft',
      message: 'Coming soon',
      linkUrl: 'events',
    });

    expect(result.success).toBe(false);
  });
});

describe('a popup’s picture', () => {
  const popup = { name: 'Launch', title: 'We are live', message: 'Come and see.' };
  const picture = 'https://res.cloudinary.com/demo/image/upload/v1/popup.jpg';

  it('keeps an https picture', () => {
    expect(sitePopupInputSchema.parse({ ...popup, imageUrl: picture }).imageUrl).toBe(picture);
  });

  it('is removed by emptying it, rather than silently kept', () => {
    // JSON drops an undefined key, so only null reaches the database as "no picture".
    expect(sitePopupUpdateSchema.parse({ imageUrl: '' })).toEqual({ imageUrl: null });
    expect(sitePopupUpdateSchema.parse({ imageUrl: null })).toEqual({ imageUrl: null });
    expect(sitePopupUpdateSchema.parse({})).toEqual({});
  });

  it('refuses an address that is not https', () => {
    for (const imageUrl of ['http://example.org/a.jpg', 'javascript:alert(1)', '/images/a.webp']) {
      expect(sitePopupInputSchema.safeParse({ ...popup, imageUrl }).success, imageUrl).toBe(false);
    }
  });
});
