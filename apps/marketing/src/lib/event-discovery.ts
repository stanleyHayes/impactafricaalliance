import type { Event } from '@iaa/shared';
export type EventPeriod = 'all' | 'upcoming' | 'past';
export const filterEvents = (
  events: Event[],
  { query, type, period }: { query: string; type: string; period: EventPeriod },
  now = Date.now(),
): Event[] => {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return events
    .filter((event) => {
      const searchable =
        `${event.title} ${event.description} ${event.location} ${event.host ?? ''}`.toLocaleLowerCase();
      const ended = new Date(event.endAt ?? event.startAt).getTime() < now;
      return (
        terms.every((term) => searchable.includes(term)) &&
        (type === 'all' || event.type === type) &&
        (period === 'all' || (period === 'past' ? ended : !ended))
      );
    })
    .sort((a, b) =>
      period === 'past'
        ? Date.parse(b.startAt) - Date.parse(a.startAt)
        : Date.parse(a.startAt) - Date.parse(b.startAt),
    );
};
