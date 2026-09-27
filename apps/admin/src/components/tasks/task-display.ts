import {
  calendarDateKey,
  dueBucket,
  isTaskOpen,
  localDateKey,
  type DueBucket,
  type TaskStatus,
  type WorkPriority,
} from '@iaa/shared';

import { TASK_STATUS_OPTIONS, WORK_PRIORITY_OPTIONS } from '../../lib/select-options';

/**
 * Small display helpers every task view shares, so a status or a due date
 * reads the same on the board, in a list and in the drawer.
 */

const labelFrom = (options: { value: string; label: string }[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

/** A status as the menus name it: `in-progress` reads "In progress". */
export const taskStatusLabel = (status: TaskStatus): string =>
  labelFrom(TASK_STATUS_OPTIONS, status);

/** A priority as the menus name it. */
export const taskPriorityLabel = (priority: WorkPriority): string =>
  labelFrom(WORK_PRIORITY_OPTIONS, priority);

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const LONG_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * A stored calendar day as text: "5 Oct", with the year when it is not this
 * year. Read through the day key, never as an instant, so it is the same day
 * for everyone (plan D6).
 */
export const formatCalendarDay = (iso: string, today: string = localDateKey()): string => {
  const key = calendarDateKey(iso);
  // Noon keeps the formatter on the same day in every time zone.
  const date = new Date(`${key}T12:00:00`);
  return key.slice(0, 4) === today.slice(0, 4) ? SHORT_DATE.format(date) : LONG_DATE.format(date);
};

export interface DueState {
  bucket: DueBucket;
  /** "Overdue · 3 Oct", "Due today", "Due 9 Oct", or null when there is no date. */
  label: string | null;
  /** True only for open work past its day. */
  late: boolean;
}

/**
 * How a task's due date should read today. Finished work is never late, so it
 * shows its date plainly whatever the calendar says.
 */
export const dueState = (
  dueDate: string | null | undefined,
  status: TaskStatus,
  today: string = localDateKey(),
): DueState => {
  if (!dueDate) return { bucket: 'none', label: null, late: false };
  const bucket = dueBucket(dueDate, today);
  const day = formatCalendarDay(dueDate, today);
  if (!isTaskOpen(status)) return { bucket, label: `Due ${day}`, late: false };
  if (bucket === 'overdue') return { bucket, label: `Overdue · ${day}`, late: true };
  if (bucket === 'today') return { bucket, label: 'Due today', late: false };
  return { bucket, label: `Due ${day}`, late: false };
};
