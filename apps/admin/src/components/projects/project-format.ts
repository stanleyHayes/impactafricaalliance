import {
  calendarDateKey,
  PROJECT_STATUS_LABELS,
  SDG_GOALS,
  type ProjectProgress,
  type ProjectStatus,
  type WorkPriority,
} from '@iaa/shared';

import { PROGRAMME_OPTIONS, WORK_PRIORITY_OPTIONS } from '../../lib/select-options';

/**
 * How project facts read on screen. One place, so the list, the header and
 * the review step say the same thing in the same words.
 */

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  // The key is already the calendar day; read it in UTC so it cannot slip.
  timeZone: 'UTC',
});

/**
 * A stored calendar date as "5 Oct 2026". Read through the day key, never as
 * an instant, so it is the same day for everyone. Empty for no date.
 */
export const formatDay = (iso: string | null | undefined): string => {
  if (!iso) return '';
  try {
    return DAY_FORMAT.format(new Date(`${calendarDateKey(iso)}T00:00:00.000Z`));
  } catch {
    return '';
  }
};

/** "5 Oct 2026 – 30 Jun 2027", "From 5 Oct 2026", "Until 30 Jun 2027" or "No dates yet". */
export const formatDateRange = (start?: string | null, end?: string | null): string => {
  const from = formatDay(start);
  const to = formatDay(end);
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return 'No dates yet';
};

/**
 * Progress in words, as the plan asks: the figure and what it counts, or the
 * figure and the reason when someone set it by hand, or a plain statement
 * that there is nothing to count yet (never "0%", which reads as failure).
 * A hand-set figure still says its number, because the bar alone is not
 * something everyone can read.
 */
export const progressText = (progress: ProjectProgress): string => {
  if (progress.source === 'manual') {
    return `${progress.value ?? 0}% · Set by hand: ${progress.reason ?? 'no reason given'}`;
  }
  if (progress.value === null) return 'Nothing to measure yet';
  return `${progress.value}% · ${progress.done} of ${progress.total} done`;
};

export const statusLabel = (status: ProjectStatus): string => PROJECT_STATUS_LABELS[status];

export const priorityLabel = (priority: WorkPriority): string =>
  WORK_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? priority;

/** A programme key as the website names it; a key no longer on the site is shown as it is. */
export const programmeLabel = (key: string | null | undefined): string =>
  key ? (PROGRAMME_OPTIONS.find((option) => option.value === key)?.label ?? key) : '';

/** "Goal 4: Quality Education", or "Goal 11" for a goal the site does not describe. */
export const sdgLabel = (goal: number): string => {
  const known = SDG_GOALS.find((item) => item.number === goal);
  return known ? `Goal ${goal}: ${known.title}` : `Goal ${goal}`;
};

/** "1 task", "3 tasks". */
export const countLabel = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;
