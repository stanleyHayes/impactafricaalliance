/**
 * Format an ISO date string consistently in UTC so the admin console displays
 * the same calendar date regardless of the user's local timezone.
 */
export const formatUtcDate = (
  iso: string | undefined | null,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date);
};

/** Short UTC date (e.g. "11 Jul 2026") for compact columns. */
export const formatUtcShort = (iso: string | undefined | null): string =>
  formatUtcDate(iso, { day: 'numeric', month: 'short' });
