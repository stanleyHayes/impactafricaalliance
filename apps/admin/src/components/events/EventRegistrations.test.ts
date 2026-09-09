import type { EventRegistration } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import { toCsv } from './EventRegistrations';

const registration = (overrides: Partial<EventRegistration> = {}): EventRegistration =>
  ({
    id: 'r1',
    eventId: 'e1',
    fullName: 'Ama Mensah',
    email: 'ama@example.com',
    country: 'Ghana',
    answers: [],
    consent: true,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
    ...overrides,
  }) as EventRegistration;

describe('exporting the attendee list', () => {
  it('carries every answer as its own column', () => {
    const csv = toCsv([
      registration({
        answers: [{ questionId: 'q1', label: 'What do you hope to learn?', value: 'Fundraising' }],
      }),
    ]);

    // Flattening answers into one cell would make the export unusable for
    // anything but reading; a column each is what a spreadsheet is for.
    expect(csv).toContain('"What do you hope to learn?"');
    expect(csv).toContain('"Fundraising"');
  });

  it('joins a multi-choice answer rather than printing an array', () => {
    const csv = toCsv([
      registration({
        answers: [{ questionId: 'q1', label: 'Interests', value: ['STEM', 'Enterprise'] }],
      }),
    ]);

    expect(csv).toContain('"STEM; Enterprise"');
  });

  it('escapes a quote instead of breaking the row', () => {
    const csv = toCsv([registration({ fullName: 'Ama "Nana" Mensah' })]);

    expect(csv).toContain('"Ama ""Nana"" Mensah"');
  });

  it('defuses a value a spreadsheet would run as a formula', () => {
    const csv = toCsv([registration({ fullName: '=1+1' })]);

    // Excel and Sheets execute a leading =, so an attendee could otherwise
    // choose what runs when the organiser opens the file.
    expect(csv).toContain(`"'=1+1"`);
    expect(csv).not.toContain('"=1+1"');
  });

  it('leaves a blank cell where an optional field was skipped', () => {
    const csv = toCsv([registration({ phone: undefined })]);
    const [, row] = csv.split('\n');

    // "undefined" printed into a spreadsheet reads as data someone entered.
    expect(row).not.toContain('undefined');
  });
});
