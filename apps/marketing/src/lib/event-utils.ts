import type { Event } from '@iaa/shared';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

export const formatEventType = (type: string): string =>
  type
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

export const formatEventDate = (iso: string): string => dateFormatter.format(new Date(iso));

/** "6:00 PM", not "18:00" — the clock Ghana and Nigeria read. */
export const formatEventTime = (iso: string): string =>
  timeFormatter.format(new Date(iso)).replace(/\b(am|pm)\b/i, (match) => match.toUpperCase());

export const sortEventsByDate = (a: Event, b: Event): number =>
  new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
