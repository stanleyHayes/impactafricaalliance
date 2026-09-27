import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  BOARD_ORDER_GAP,
  booleanQueryParam,
  boardOrderBetween,
  calendarDateKey,
  calendarDateSchema,
  clearableTextField,
  commaList,
  dueBucket,
  fileAssetSchema,
  fileAttachmentInputSchema,
  hasUniqueIds,
  httpsMediaAssetSchema,
  httpsUrlSchema,
  isCalendarDateKey,
  isHttpsLink,
  localDateKey,
  newStableId,
  optionalTextField,
  peopleQuerySchema,
  STABLE_ID_PATTERN,
  stableIdSchema,
  toCalendarDateIso,
  todayKey,
  WORK_PRIORITIES,
  WORK_PRIORITY_RANK,
} from './work.js';

const HOUR = 60 * 60 * 1000;

/** The calendar day an instant falls on for someone at a fixed UTC offset. */
const keyAtOffset = (iso: string, offsetHours: number): string =>
  new Date(Date.parse(iso) + offsetHours * HOUR).toISOString().slice(0, 10);

describe('priorities', () => {
  it('ranks them from least to most pressing', () => {
    const ranked = [...WORK_PRIORITIES].sort(
      (a, b) => WORK_PRIORITY_RANK[a] - WORK_PRIORITY_RANK[b],
    );
    expect(ranked).toEqual(['low', 'medium', 'high', 'urgent']);
  });
});

describe('stable ids', () => {
  it('accepts short lowercase ids and refuses anything a sanitiser or URL would mangle', () => {
    expect(stableIdSchema.safeParse('full-name').success).toBe(true);
    expect(stableIdSchema.safeParse('q_1').success).toBe(true);
    expect(stableIdSchema.safeParse('Full-Name').success).toBe(false);
    expect(stableIdSchema.safeParse('-leading').success).toBe(false);
    expect(stableIdSchema.safeParse('has.dot').success).toBe(false);
    expect(stableIdSchema.safeParse('$where').success).toBe(false);
    expect(stableIdSchema.safeParse('a'.repeat(41)).success).toBe(false);
  });

  it('makes ids that always pass the pattern', () => {
    for (const prefix of [undefined, 'step', 'My Step!!', '--odd__', 'x'.repeat(80), '']) {
      const id = newStableId(prefix);
      expect(id).toMatch(STABLE_ID_PATTERN);
    }
  });

  it('keeps a readable prefix', () => {
    expect(newStableId('My Step')).toMatch(/^my-step-[0-9a-f]{12}$/);
  });

  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newStableId('block')));
    expect(ids.size).toBe(1000);
  });

  describe('without crypto.randomUUID', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('still makes valid ids, as on a dashboard served over plain http', () => {
      vi.stubGlobal('crypto', {});
      const id = newStableId('field');
      expect(id).toMatch(/^field-[0-9a-f]{12}$/);
    });
  });

  it('spots a repeated id in a list', () => {
    expect(hasUniqueIds([{ id: 'a' }, { id: 'b' }])).toBe(true);
    expect(hasUniqueIds([{ id: 'a' }, { id: 'a' }])).toBe(false);
  });
});

describe('text fields', () => {
  const create = z.object({ note: optionalTextField(10) });
  const update = z.object({ note: clearableTextField(10) });

  it('treats an emptied input as nothing on create', () => {
    expect(create.parse({ note: '   ' })).toEqual({});
    expect(create.parse({ note: ' hi ' })).toEqual({ note: 'hi' });
    expect(create.safeParse({ note: 'x'.repeat(11) }).success).toBe(false);
  });

  it('treats an emptied input as "clear it" on update, and absent as "leave it"', () => {
    expect(update.parse({})).toEqual({});
    expect(update.parse({ note: '' })).toEqual({ note: null });
    expect(update.parse({ note: null })).toEqual({ note: null });
    expect(update.parse({ note: 'kept' })).toEqual({ note: 'kept' });
  });
});

describe('https links', () => {
  it('accepts https and nothing else', () => {
    expect(httpsUrlSchema.safeParse('https://impactafricaalliance.org').success).toBe(true);
    expect(httpsUrlSchema.safeParse('http://impactafricaalliance.org').success).toBe(false);
    expect(httpsUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(httpsUrlSchema.safeParse('mailto:info@example.org').success).toBe(false);
  });

  // The user-name part of a URL is the classic phishing disguise: this reads
  // as our site and opens evil.example.
  it('refuses a link that hides its real host behind a user name', () => {
    expect(isHttpsLink('https://impactafricaalliance.org@evil.example/donate')).toBe(false);
    expect(isHttpsLink('https://user:secret@impactafricaalliance.org')).toBe(false);
    expect(httpsUrlSchema.safeParse('https://a@b.example').success).toBe(false);
    expect(isHttpsLink('https://medium.com/@impactafrica')).toBe(true);
  });

  it('refuses backslashes and hosts the URL parser cannot read', () => {
    expect(isHttpsLink('https://evil.example\\@impactafricaalliance.org')).toBe(false);
    expect(isHttpsLink('https://impactafricaalliance.org/a\\b')).toBe(false);
    expect(isHttpsLink('https://%%')).toBe(false);
  });
});

describe('stored images and files', () => {
  // Their addresses are rendered as src and href attributes, so a script
  // address stored here would run in a colleague's or a visitor's browser.
  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://x.example/a',
  ])('refuses an image or file stored at %s', (url) => {
    expect(httpsMediaAssetSchema.safeParse({ url, publicId: 'iaa/a' }).success).toBe(false);
    expect(fileAssetSchema.safeParse({ url, publicId: 'iaa/a' }).success).toBe(false);
  });

  it('accepts what Cloudinary returns as the secure address', () => {
    const asset = { url: 'https://res.cloudinary.com/iaa/image/upload/a.jpg', publicId: 'iaa/a' };
    expect(httpsMediaAssetSchema.parse(asset)).toEqual(asset);
  });
});

describe('query parameters', () => {
  const query = z.object({ archived: booleanQueryParam });

  it('reads "false" as false, which z.coerce.boolean() gets wrong', () => {
    expect(query.parse({ archived: 'false' })).toEqual({ archived: false });
    expect(query.parse({ archived: 'true' })).toEqual({ archived: true });
    expect(z.coerce.boolean().parse('false')).toBe(true);
  });

  it('leaves an absent flag absent and refuses anything else', () => {
    expect(query.parse({})).toEqual({});
    expect(query.safeParse({ archived: 'yes' }).success).toBe(false);
  });

  it('splits a comma list, from one value or repeated keys', () => {
    const list = z.object({ status: commaList(z.enum(['todo', 'done']), 2).optional() });
    expect(list.parse({ status: 'todo, done,' })).toEqual({ status: ['todo', 'done'] });
    expect(list.parse({ status: ['todo', 'done'] })).toEqual({ status: ['todo', 'done'] });
    expect(list.parse({ status: '' })).toEqual({ status: [] });
    expect(list.parse({})).toEqual({});
    expect(list.safeParse({ status: 'todo,later' }).success).toBe(false);
    expect(list.safeParse({ status: 'todo,done,todo' }).success).toBe(false);
  });
});

describe('the people directory query', () => {
  const idA = '64b7f0c2a1b2c3d4e5f60718';
  const idB = '64b7f0c2a1b2c3d4e5f60719';

  it('parses ids into a list', () => {
    expect(peopleQuerySchema.parse({ ids: `${idA},${idB}` })).toEqual({
      page: 1,
      pageSize: 20,
      ids: [idA, idB],
    });
  });

  it('refuses something that is not an id, and more than fifty', () => {
    expect(peopleQuerySchema.safeParse({ ids: `${idA},nope` }).success).toBe(false);
    const tooMany = Array.from({ length: 51 }, () => idA).join(',');
    expect(peopleQuerySchema.safeParse({ ids: tooMany }).success).toBe(false);
  });

  it('trims the search and drops an empty one', () => {
    expect(peopleQuerySchema.parse({ q: '  ada ' }).q).toBe('ada');
    expect(peopleQuerySchema.parse({ q: '' }).q).toBeUndefined();
    expect(peopleQuerySchema.safeParse({ q: 'a'.repeat(81) }).success).toBe(false);
  });
});

describe('file attachments', () => {
  const file = { url: 'https://res.cloudinary.com/x/raw/upload/plan.pdf', publicId: 'iaa/plan' };

  it('names the attachment and keeps the file details', () => {
    expect(
      fileAttachmentInputSchema.parse({
        name: '  Workplan ',
        file: { ...file, bytes: 1200, format: 'pdf' },
      }),
    ).toEqual({ name: 'Workplan', file: { ...file, bytes: 1200, format: 'pdf' } });
  });

  it('refuses a blank name', () => {
    expect(fileAttachmentInputSchema.safeParse({ name: '   ', file }).success).toBe(false);
  });
});

describe('calendar dates', () => {
  it('stores a chosen day at noon UTC and reads it back', () => {
    const iso = toCalendarDateIso('2026-10-05');
    expect(iso).toBe('2026-10-05T12:00:00.000Z');
    expect(calendarDateKey(iso)).toBe('2026-10-05');
    expect(calendarDateKey('2026-10-05')).toBe('2026-10-05');
  });

  it('refuses days that do not exist rather than shifting them', () => {
    expect(() => toCalendarDateIso('2026-02-30')).toThrow(RangeError);
    expect(() => toCalendarDateIso('05/10/2026')).toThrow(RangeError);
    expect(() => calendarDateKey('next tuesday')).toThrow(RangeError);
    expect(isCalendarDateKey('2028-02-29')).toBe(true);
    expect(isCalendarDateKey('2026-02-29')).toBe(false);
    expect(calendarDateSchema.safeParse('2026-10-05').success).toBe(true);
    expect(calendarDateSchema.safeParse('2026-13-01').success).toBe(false);
    expect(calendarDateSchema.safeParse('2026-10-5').success).toBe(false);
  });

  // JavaScript's parser reads these as 2 March and 1 May.
  it('refuses a stored date on a day that does not exist, rather than reading the next month', () => {
    expect(() => calendarDateKey('2026-02-30')).toThrow(RangeError);
    expect(() => calendarDateKey('2026-04-31T12:00:00.000Z')).toThrow(RangeError);
    expect(calendarDateKey('2028-02-29T12:00:00.000Z')).toBe('2028-02-29');
  });

  it('reads across month and year ends without slipping', () => {
    expect(calendarDateKey(toCalendarDateIso('2026-12-31'))).toBe('2026-12-31');
    expect(calendarDateKey(toCalendarDateIso('2027-01-01'))).toBe('2027-01-01');
    expect(calendarDateKey(toCalendarDateIso('2026-02-28'))).toBe('2026-02-28');
    expect(calendarDateKey('2026-12-31T23:59:59.999Z')).toBe('2026-12-31');
  });

  it('shows the same day to everyone from UTC-11 to UTC+11', () => {
    const stored = toCalendarDateIso('2026-10-05');
    for (let offset = -11; offset <= 11; offset += 1) {
      expect(keyAtOffset(stored, offset)).toBe('2026-10-05');
    }
  });

  it('would slip a day at UTC+12, which is where the noon choice runs out', () => {
    expect(keyAtOffset(toCalendarDateIso('2026-10-05'), 12)).toBe('2026-10-06');
  });

  it('gives today in UTC on the server and in local time in the browser', () => {
    expect(todayKey(new Date('2026-10-05T23:30:00.000Z'))).toBe('2026-10-05');
    // Built from local parts, so this holds in whatever zone the tests run.
    expect(localDateKey(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
  });
});

describe('due buckets', () => {
  const due = toCalendarDateIso('2026-10-05');

  it('files work with no date under none', () => {
    expect(dueBucket(null, '2026-10-05')).toBe('none');
    expect(dueBucket(undefined, '2026-10-05')).toBe('none');
    expect(dueBucket('', '2026-10-05')).toBe('none');
    expect(dueBucket('not a date', '2026-10-05')).toBe('none');
  });

  it('compares days, not instants', () => {
    expect(dueBucket(due, '2026-10-04')).toBe('upcoming');
    expect(dueBucket(due, '2026-10-05')).toBe('today');
    expect(dueBucket(due, '2026-10-06')).toBe('overdue');
    expect(dueBucket('2026-10-05T23:59:00.000Z', '2026-10-05')).toBe('today');
  });

  it('crosses a year end correctly', () => {
    expect(dueBucket(toCalendarDateIso('2026-12-31'), '2027-01-01')).toBe('overdue');
    expect(dueBucket(toCalendarDateIso('2027-01-01'), '2026-12-31')).toBe('upcoming');
  });

  // The buckets compare text, so '2026-10-5' would sort after every October
  // date and file the whole month as overdue without a word.
  it('refuses a today that is not a real YYYY-MM-DD day', () => {
    expect(() => dueBucket(due, '2026-10-5')).toThrow(RangeError);
    expect(() => dueBucket(due, 'today')).toThrow(RangeError);
    expect(() => dueBucket(null, '2026-02-30')).toThrow(RangeError);
  });

  it("answers for the caller's own day, whichever side of the date line they are on", () => {
    // 20:00 UTC on 5 October is 09:00 on the 5th in UTC-11 and 07:00 on the
    // 6th in UTC+11, so the same task means different things to each.
    const now = '2026-10-05T20:00:00.000Z';
    const westToday = keyAtOffset(now, -11);
    const eastToday = keyAtOffset(now, 11);
    expect(westToday).toBe('2026-10-05');
    expect(eastToday).toBe('2026-10-06');

    expect(dueBucket(due, westToday)).toBe('today');
    expect(dueBucket(due, eastToday)).toBe('overdue');

    const dueSixth = toCalendarDateIso('2026-10-06');
    expect(dueBucket(dueSixth, westToday)).toBe('upcoming');
    expect(dueBucket(dueSixth, eastToday)).toBe('today');
  });
});

describe('board order', () => {
  it('starts an empty column at the gap', () => {
    expect(boardOrderBetween()).toBe(BOARD_ORDER_GAP);
    expect(boardOrderBetween(null, null)).toBe(BOARD_ORDER_GAP);
  });

  it('goes after the last card or before the first', () => {
    expect(boardOrderBetween(2048)).toBe(3072);
    expect(boardOrderBetween(null, 1024)).toBe(0);
    expect(boardOrderBetween(undefined, 0)).toBe(-1024);
  });

  it('takes the midpoint between two cards', () => {
    expect(boardOrderBetween(1024, 2048)).toBe(1536);
    expect(boardOrderBetween(-10, 10)).toBe(0);
  });

  it('treats zero as a real position, not a missing one', () => {
    expect(boardOrderBetween(0, null)).toBe(1024);
    expect(boardOrderBetween(0, 1)).toBe(0.5);
  });

  it('never copies a broken neighbour position onto the moved card', () => {
    expect(boardOrderBetween(Number.NaN, 2048)).toBe(1024);
    expect(boardOrderBetween(1024, Number.NaN)).toBe(2048);
    expect(boardOrderBetween(Number.POSITIVE_INFINITY, Number.NaN)).toBe(BOARD_ORDER_GAP);
  });
});
