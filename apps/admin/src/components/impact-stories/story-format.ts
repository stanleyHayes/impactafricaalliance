import { formatUtcDate } from '../../lib/date';
import { relativeTime } from '../audit/ActivityTimeline';

/** "Updated 3 hours ago", or the date once it is more than a week old. */
export const updatedLabel = (iso: string, now: number = Date.now()): string =>
  `Updated ${relativeTime(iso, now) ?? formatUtcDate(iso)}`;
