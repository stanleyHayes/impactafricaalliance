import type { Event } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import { filterEvents } from './event-discovery';
const makeEvent = (overrides: Partial<Event>): Event =>
  ({
    id: 'one',
    title: 'Building a business',
    description: 'Practical skills',
    location: 'Accra',
    startAt: '2026-09-05T10:00:00Z',
    type: 'webinar',
    ...overrides,
  }) as Event;
const now = Date.parse('2026-09-05T12:00:00Z');
describe('event discovery', () => {
  it('combines search words across title, location and host with type filters', () => {
    const events = [makeEvent({ host: 'Ama', id: 'match' }), makeEvent({ location: 'Lagos' })];
    expect(
      filterEvents(events, { query: ' ACCRA ama ', type: 'webinar', period: 'all' }, now).map(
        (event) => event.id,
      ),
    ).toEqual(['match']);
    expect(filterEvents(events, { query: 'Accra', type: 'workshop', period: 'all' }, now)).toEqual(
      [],
    );
  });
  it('keeps ongoing events upcoming and sorts past events newest first', () => {
    const events = [
      makeEvent({ id: 'ongoing', endAt: '2026-09-05T14:00:00Z' }),
      makeEvent({ id: 'older', startAt: '2026-09-01T10:00:00Z' }),
      makeEvent({ id: 'recent' }),
    ];
    expect(
      filterEvents(events, { query: '', type: 'all', period: 'upcoming' }, now).map(
        (event) => event.id,
      ),
    ).toEqual(['ongoing']);
    expect(
      filterEvents(events, { query: '', type: 'all', period: 'past' }, now).map(
        (event) => event.id,
      ),
    ).toEqual(['recent', 'older']);
  });
});
