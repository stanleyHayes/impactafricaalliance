import { describe, expect, it } from 'vitest';

import type { Event } from '../schemas/event.js';

import { buildEventIcs, eventIcsFilename } from './calendar.js';

const event: Event = {
  id: 'abc123',
  title: 'Leveraging AI to Accelerate Your Career',
  description: 'A practical session; bring questions, notes, and an open mind.',
  startAt: '2026-09-11T17:00:00.000Z',
  location: 'Online',
  type: 'webinar',
  status: 'published',
  host: 'Joshua Opoku Agyemang',
  hostTitle: 'President, Ghana STEM Network',
  registrationEnabled: true,
  questions: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const options = { url: 'https://www.impactafricaalliance.org/events/abc123', now: new Date(0) };
const lines = (ics: string): string[] => ics.split('\r\n');

describe('event calendar files', () => {
  it('produces a well-formed single-event calendar', () => {
    const ics = buildEventIcs(event, options);
    expect(lines(ics)[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('UID:event-abc123@impactafricaalliance.org');
    expect(ics).toContain('DTSTART:20260911T170000Z');
    // No end time given, so it runs the default hour.
    expect(ics).toContain('DTEND:20260911T180000Z');
    expect(ics).toContain('DTSTAMP:19700101T000000Z');
  });

  it('uses the stated end time when the event has one', () => {
    const ics = buildEventIcs({ ...event, endAt: '2026-09-11T19:30:00.000Z' }, options);
    expect(ics).toContain('DTEND:20260911T193000Z');
  });

  it('escapes the characters iCalendar reserves', () => {
    const ics = buildEventIcs(event, options);
    // The description's semicolon and comma must survive as escaped literals.
    expect(ics).toContain('bring questions\\, notes');
    expect(ics).toContain('practical session\\;');
  });

  it('folds every line to the 75-octet limit', () => {
    const ics = buildEventIcs(event, options);
    for (const line of lines(ics)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('unfolds back to the original text', () => {
    const ics = buildEventIcs(event, options);
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain(`SUMMARY:${event.title}`);
    expect(unfolded).toContain('Hosted by: Joshua Opoku Agyemang — President');
  });

  it('includes the joining link only when one is supplied', () => {
    const withoutLink = buildEventIcs(event, options);
    expect(withoutLink).not.toContain('Join here');
    expect(withoutLink.replace(/\r\n /g, '')).toContain('LOCATION:Online');

    const withLink = buildEventIcs(event, { ...options, meetingUrl: 'https://meet.example.com/x' });
    const unfolded = withLink.replace(/\r\n /g, '');
    expect(unfolded).toContain('Join here: https://meet.example.com/x');
    expect(unfolded).toContain('LOCATION:https://meet.example.com/x');
  });

  it('names the file after the event', () => {
    expect(eventIcsFilename(event)).toBe('leveraging-ai-to-accelerate-your-career.ics');
    expect(eventIcsFilename({ ...event, title: '!!!' })).toBe('event.ics');
  });
});
