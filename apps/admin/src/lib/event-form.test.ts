import type { Event } from '@iaa/shared';
import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  emptyEventForm,
  eventPatch,
  eventStepError,
  eventToForm,
  parseEventForm,
  scheduleErrors,
} from './event-form';

const event: Event = {
  id: 'event-1',
  title: 'Youth skills workshop',
  description: 'A practical workshop for emerging community leaders.',
  type: 'community-event',
  status: 'published',
  startAt: '2026-09-18T22:35:24.123Z',
  endAt: '2026-09-19T01:15:37.456Z',
  registrationClosesAt: '2026-09-17T15:42:13.789Z',
  location: 'Accra',
  registrationEnabled: true,
  capacity: 25,
  questions: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

describe('event form scheduling', () => {
  it('starts a calendar-created event at 09:00 on the selected local day', () => {
    const form = emptyEventForm('2026-09-18');
    expect(form.startAt?.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-09-18 09:00:00.000');
    expect(form.endAt).toBeNull();
    expect(form.registrationClosesAt).toBeNull();
  });

  it('retains exact stored instants and produces explicit removals for cleared optional dates', () => {
    const form = eventToForm(event);
    const unchanged = parseEventForm(form);
    expect(unchanged.success).toBe(true);
    if (!unchanged.success) throw unchanged.error;
    expect(unchanged.data).toMatchObject({
      startAt: event.startAt,
      endAt: event.endAt,
      registrationClosesAt: event.registrationClosesAt,
      registrationEnabled: true,
      status: 'published',
    });

    const cleared = parseEventForm({ ...form, endAt: null, registrationClosesAt: null });
    expect(cleared.success).toBe(true);
    if (!cleared.success) throw cleared.error;
    expect(eventPatch(cleared.data, event)).toMatchObject({
      startAt: event.startAt,
      endAt: null,
      registrationClosesAt: null,
      registrationEnabled: true,
      capacity: 25,
    });
    expect(eventPatch(cleared.data).endAt).toBeUndefined();
    expect(eventPatch(cleared.data).registrationClosesAt).toBeUndefined();
  });

  it('round-trips a meeting link and clears it explicitly when emptied', () => {
    const online: Event = { ...event, meetingUrl: 'https://meet.example.com/iaa-webinar' };
    const form = eventToForm(online);
    expect(form.meetingUrl).toBe('https://meet.example.com/iaa-webinar');

    const kept = parseEventForm(form);
    expect(kept.success).toBe(true);
    if (!kept.success) throw kept.error;
    expect(kept.data.meetingUrl).toBe('https://meet.example.com/iaa-webinar');

    const emptied = parseEventForm({ ...form, meetingUrl: '' });
    expect(emptied.success).toBe(true);
    if (!emptied.success) throw emptied.error;
    expect(emptied.data.meetingUrl).toBeUndefined();
    // An editor who clears the box means "remove it", not "leave it as it was".
    expect(eventPatch(emptied.data, online).meetingUrl).toBeNull();
  });

  it('validates automation on the follow-up step and clears saved timing values', () => {
    const form = eventToForm({ ...event, reminderHoursBefore: 24, thankYouMinutesAfter: 60 });
    expect(eventStepError({ ...form, reminderHoursBefore: '169' }, 3)).toBeDefined();
    expect(eventStepError({ ...form, reminderHoursBefore: '169' }, 2)).toBeUndefined();
    const parsed = parseEventForm({ ...form, reminderHoursBefore: '', thankYouMinutesAfter: '' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw parsed.error;
    expect(eventPatch(parsed.data, event)).toMatchObject({
      reminderHoursBefore: null,
      thankYouMinutesAfter: null,
    });
  });

  it('rejects a meeting link that is not a URL, on the registration step', () => {
    const form = { ...eventToForm(event), meetingUrl: 'not a link' };
    expect(parseEventForm(form).success).toBe(false);
    expect(eventStepError(form, 2)).toBeDefined();
    expect(eventStepError(form, 0)).toBeUndefined();
  });

  it('blocks incomplete or incorrectly ordered dates on their own step without blocking unrelated steps', () => {
    const valid = eventToForm(event);
    const incompleteEnd = { ...valid, endAt: dayjs('not-a-date') };
    expect(eventStepError(incompleteEnd, 0)).toBeUndefined();
    expect(eventStepError(incompleteEnd, 1)).toBe(
      'Enter a complete end date and time, or clear it.',
    );
    expect(scheduleErrors({ ...valid, startAt: null }).startAt).toBe(
      'Choose a valid start date and time.',
    );
    expect(eventStepError({ ...valid, endAt: valid.startAt }, 1)).toBe('End must be after start.');
    expect(eventStepError({ ...valid, registrationClosesAt: valid.endAt }, 1)).toBeUndefined();
    expect(eventStepError({ ...valid, registrationClosesAt: valid.endAt }, 2)).toBe(
      'Registration must close by the start of the event.',
    );
  });
});
