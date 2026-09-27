import { calendarDateKey, toCalendarDateIso, type TaskStatus, type UserRole } from '@iaa/shared';

/**
 * The tasks module's rules that need no database, kept apart so they can be
 * tested on their own and read in one place.
 */

/**
 * Who is making a change: always the signed-in user from the request's token
 * (`req.user`), never an id sent in a body (plan D16).
 */
export interface TaskActor {
  id: string;
  email: string;
  role: UserRole;
}

/** Ids as the database compares them: lower-case, each once, in first-seen order. */
export const uniqueIds = (ids: readonly string[]): string[] => [
  ...new Set(ids.map((id) => id.toLowerCase())),
];

/**
 * Labels without repeats, ignoring case: `Finance` and `finance` are one
 * label, kept as first typed.
 */
export const uniqueLabels = (labels: readonly string[]): string[] => {
  const seen = new Set<string>();
  return labels.filter((label) => {
    const key = label.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** How the activity log and event summaries name each status. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  'in-progress': 'In progress',
  review: 'In review',
  done: 'Done',
  blocked: 'Blocked',
};

/**
 * When a task was finished, after a change of status.
 *
 * Set on entering `done` and cleared on leaving it, so "completed" always
 * describes the task as it is now. A task already done keeps its original
 * time: a board move within the Done column, or the API client retrying the
 * same move, must not make old work look freshly finished.
 */
export const completedAtAfter = (
  before: { status: TaskStatus; completedAt?: Date | null },
  nextStatus: TaskStatus,
  now: Date,
): Date | null => {
  if (nextStatus !== 'done') {
    return null;
  }
  return before.status === 'done' && before.completedAt ? before.completedAt : now;
};

/**
 * A calendar day as the database keeps it: noon UTC on that day (plan D6).
 *
 * The schema accepts any ISO instant. The dashboard already sends noon
 * (`toCalendarDateIso`); anything else is moved to noon of the UTC day it
 * falls in, so every stored date sits at noon and the due buckets can compare
 * whole days. A caller east of Greenwich that sends its local midnight lands
 * on the day before, which is why clients should send the day itself.
 * Undefined means "not in this request"; null means "clear it".
 */
export const toStoredCalendarDate = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined || value === null) {
    return value;
  }
  return new Date(toCalendarDateIso(calendarDateKey(value)));
};

/** True when a due date falls on an earlier day than the start. */
export const dueBeforeStart = (
  startDate: Date | null | undefined,
  dueDate: Date | null | undefined,
): boolean => Boolean(startDate && dueDate && dueDate.getTime() < startDate.getTime());

/** Longest chain of parents followed before giving up; far deeper than any real plan. */
export const MAX_PARENT_DEPTH = 100;

/**
 * Whether making `parentId` the parent of `taskId` would close a loop, such
 * as a task becoming a subtask of its own subtask.
 *
 * Walks up from the proposed parent through each parent in turn. A chain
 * that already loops, or runs deeper than `MAX_PARENT_DEPTH`, also counts as a
 * loop: saving onto broken data would only make it worse, and refusing is the
 * safe answer. `parentOf` looks one task's parent up; it is passed in so the
 * rule can be tested without a database.
 */
export const wouldCreateParentLoop = async (
  taskId: string,
  parentId: string,
  parentOf: (id: string) => Promise<string | null>,
): Promise<boolean> => {
  const seen = new Set<string>();
  let current: string | null = parentId;
  for (let depth = 0; depth < MAX_PARENT_DEPTH; depth += 1) {
    if (current === null) {
      return false;
    }
    if (current === taskId || seen.has(current)) {
      return true;
    }
    seen.add(current);
    current = await parentOf(current);
  }
  return true;
};

/** Field names as a sentence reads them: `dueDate` becomes "due date". */
const FIELD_WORDS: Record<string, string> = {
  title: 'title',
  description: 'description',
  priority: 'priority',
  projectId: 'project',
  milestoneId: 'milestone',
  startDate: 'start date',
  dueDate: 'due date',
  estimateHours: 'estimate',
  labels: 'labels',
  parentTaskId: 'parent task',
  dependencyIds: 'dependencies',
};

/** "title", "title and due date", "title, labels and due date". */
export const listInWords = (words: readonly string[]): string => {
  if (words.length <= 1) {
    return words[0] ?? '';
  }
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
};

/** The activity line for an edit, such as "Changed the title and due date". */
export const describeFieldChanges = (fields: readonly string[]): string =>
  `Changed the ${listInWords(fields.map((field) => FIELD_WORDS[field] ?? field))}`;
