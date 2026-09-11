import { describe, expect, it } from 'vitest';

import { sitePopupUpdateSchema } from './campaign.js';
import { clearableDate } from './common.js';

describe('a date the form can clear', () => {
  it('keeps a real date', () => {
    expect(clearableDate.parse('2026-10-09T00:00:00.000Z')).toBe('2026-10-09T00:00:00.000Z');
  });

  it('treats null as "remove this"', () => {
    expect(clearableDate.parse(null)).toBeNull();
  });

  it('treats an emptied field as "remove this" too', () => {
    expect(clearableDate.parse('')).toBeNull();
  });

  it('leaves an absent field alone', () => {
    // Absent means the form had nothing to say about it, which is different
    // from being told to clear it.
    expect(clearableDate.parse(undefined)).toBeUndefined();
  });

  it('still refuses something that is not a date', () => {
    expect(clearableDate.safeParse('next tuesday').success).toBe(false);
  });
});

describe('clearing a popup schedule through an update', () => {
  it('carries the null through so the stored date is removed', () => {
    const parsed = sitePopupUpdateSchema.parse({ endsAt: null });

    // Without this the PATCH omits the key, the server leaves the old value
    // in place, and the date reappears after a save that reported success.
    expect(parsed).toHaveProperty('endsAt', null);
  });

  it('does not invent keys the form never sent', () => {
    expect(sitePopupUpdateSchema.parse({})).toEqual({});
  });
});
