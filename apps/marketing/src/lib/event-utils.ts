import type { Event } from '@iaa/shared';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

export const formatEventType = (type: string): string =>
  type
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

export const formatEventDate = (iso: string): string => dateFormatter.format(new Date(iso));

export const formatEventTime = (iso: string): string => timeFormatter.format(new Date(iso));

export const sortEventsByDate = (a: Event, b: Event): number =>
  new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
