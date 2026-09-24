import { describe, expect, it } from 'vitest';

import { compareEvents, isPastEvent } from './event-order.js';

const now = Date.parse('2026-09-24T12:00:00Z');
describe('event ordering', () => {
  it('puts ongoing and nearest upcoming events before recent and older past events without mutating input', () => {
    const events = [
      { startAt: '2026-09-01T10:00:00Z' },
      { startAt: '2026-10-01T10:00:00Z' },
      { startAt: '2026-09-24T10:00:00Z', endAt: '2026-09-24T14:00:00Z' },
      { startAt: '2026-09-23T10:00:00Z' },
      { startAt: '2026-09-25T10:00:00Z' },
    ];
    expect([...events].sort((a, b) => compareEvents(a, b, now))).toEqual([
      events[2],
      events[4],
      events[1],
      events[3],
      events[0],
    ]);
  });
  it('uses the end time when available and otherwise the start time', () => {
    expect(isPastEvent({ startAt: '2026-09-24T10:00:00Z' }, now)).toBe(true);
    expect(
      isPastEvent({ startAt: '2026-09-24T10:00:00Z', endAt: '2026-09-24T12:00:00Z' }, now),
    ).toBe(false);
    expect(
      isPastEvent({ startAt: '2026-09-24T10:00:00Z', endAt: '2026-09-24T11:59:59Z' }, now),
    ).toBe(true);
  });
});
