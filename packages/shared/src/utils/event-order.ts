import type { Event } from '../schemas/event.js';

type EventSchedule = Pick<Event, 'startAt' | 'endAt'>;

export const isPastEvent = (event: EventSchedule, now = Date.now()): boolean =>
  Date.parse(event.endAt ?? event.startAt) < now;

/** Upcoming and ongoing first, then past events from newest to oldest. */
export const compareEvents = (a: EventSchedule, b: EventSchedule, now = Date.now()): number => {
  const aPast = isPastEvent(a, now);
  const bPast = isPastEvent(b, now);
  if (aPast !== bPast) return aPast ? 1 : -1;
  return aPast
    ? Date.parse(b.startAt) - Date.parse(a.startAt)
    : Date.parse(a.startAt) - Date.parse(b.startAt);
};
