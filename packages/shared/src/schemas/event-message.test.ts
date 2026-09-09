import { describe, expect, it } from 'vitest';

import { bodyToHtml, reminderDueAt, thankYouDueAt } from './event-message.js';

const escape = (value: string): string => value.replace(/</g, '&lt;');

describe('turning the composer text into an email', () => {
  it('makes a paragraph of each block', () => {
    expect(bodyToHtml('One.\n\nTwo.', escape)).toBe('<p>One.</p><p>Two.</p>');
  });

  it('keeps a single newline as a line break', () => {
    expect(bodyToHtml('Line one\nLine two', escape)).toBe('<p>Line one<br />Line two</p>');
  });

  it('escapes what an organiser typed', () => {
    // The composer is plain text, so anything angle-bracketed is a character
    // they meant, not markup they intended to run.
    expect(bodyToHtml('<script>', escape)).toBe('<p>&lt;script></p>');
  });
});

describe('when the automated messages are due', () => {
  const event = { startAt: '2026-09-11T17:00:00Z', endAt: '2026-09-11T18:30:00Z' };

  it('counts a reminder back from the start', () => {
    expect(reminderDueAt({ ...event, reminderHoursBefore: 24 })?.toISOString()).toBe(
      '2026-09-10T17:00:00.000Z',
    );
  });

  it('has no reminder due when none was asked for', () => {
    expect(reminderDueAt({ ...event, reminderHoursBefore: null })).toBeNull();
  });

  it('counts thanks forward from the end', () => {
    expect(thankYouDueAt({ ...event, thankYouMinutesAfter: 15 })?.toISOString()).toBe(
      '2026-09-11T18:45:00.000Z',
    );
  });

  it('falls back to the start when no end was recorded', () => {
    // Without an end time the start is the only anchor there is, so thanks go
    // out relative to that rather than never.
    expect(
      thankYouDueAt({ startAt: '2026-09-11T17:00:00Z', thankYouMinutesAfter: 30 })?.toISOString(),
    ).toBe('2026-09-11T17:30:00.000Z');
  });
});
