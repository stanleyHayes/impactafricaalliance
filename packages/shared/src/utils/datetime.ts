/**
 * How the organisation writes dates and times.
 *
 * Twelve-hour with an uppercase meridiem: "Friday, 11 September 2026 at
 * 6:00 PM". Ghana and Nigeria read the clock that way, and "18:00" on a
 * reminder is a moment's translation at exactly the point a reader should be
 * certain.
 *
 * en-GB gives the day-before-month order and a lowercase meridiem, so the
 * meridiem is raised afterwards rather than switching to en-US and getting
 * "September 11, 2026".
 */
const uppercaseMeridiem = (value: string): string =>
  value.replace(/\b(am|pm)\b/i, (match) => match.toUpperCase());

const DATE_PARTS = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
} as const;

const TIME_PARTS = { hour: 'numeric', minute: '2-digit', hour12: true } as const;

/** "Friday, 11 September 2026 at 6:00 PM" */
export const formatDateTime = (value: Date | string, timeZone = 'UTC'): string =>
  uppercaseMeridiem(
    new Intl.DateTimeFormat('en-GB', { ...DATE_PARTS, ...TIME_PARTS, timeZone }).format(
      new Date(value),
    ),
  );

/** "11 September 2026" — no weekday, for tables and lists. */
export const formatDateShort = (value: Date | string, timeZone = 'UTC'): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(new Date(value));

/** "6:00 PM" */
export const formatTime = (value: Date | string, timeZone = 'UTC'): string =>
  uppercaseMeridiem(new Intl.DateTimeFormat('en-GB', { ...TIME_PARTS, timeZone }).format(new Date(value)));

/** "11 Sept 2026, 6:00 PM" — compact, for admin tables. */
export const formatDateTimeShort = (value: Date | string, timeZone = 'UTC'): string =>
  `${formatDateShort(value, timeZone)}, ${formatTime(value, timeZone)}`;
