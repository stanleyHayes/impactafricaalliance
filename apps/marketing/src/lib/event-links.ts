const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

/**
 * The API serves the calendar file directly, so the browser downloads it rather
 * than the app having to build one. The same file is attached to a registrant's
 * confirmation email, which keeps the two copies identical.
 */
export const calendarUrlFor = (eventId: string): string =>
  `${BASE_URL}/events/${eventId}/calendar.ics`;
