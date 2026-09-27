import {
  WORK_PRIORITIES,
  todayKey,
  type DueBucket,
  type SortOrder,
  type TaskBoardQuery,
  type TaskSort,
} from '@iaa/shared';
import { Types, type PipelineStage } from 'mongoose';

import { escapeRegex, searchRegex } from '../../common/regex.js';

/**
 * Turning the list and board filters (`taskListQuerySchema`,
 * `taskBoardQuerySchema`) into MongoDB queries.
 *
 * Every filter is built with real ObjectIds and Dates rather than strings,
 * because the list runs as an aggregation, and aggregations do not cast.
 */

type Filter = Record<string, unknown>;

const DAY_MS = 86_400_000;
const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * The first instant of `today` and of the day after, in UTC.
 *
 * Due dates are stored at noon UTC and read back as their UTC calendar day
 * (plan D6), so a task is due "today" exactly when its stored instant falls
 * between these two. Comparing whole days is what keeps a task due today
 * from turning overdue at one minute past noon.
 */
export const dayBounds = (today: string): { start: Date; end: Date } => {
  const start = new Date(`${today}T00:00:00.000Z`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
};

/**
 * One due bucket as query conditions, compared with the caller's own day.
 *
 * Overdue means open work only: a finished task is never late, whatever its
 * date said, so `due=overdue` leaves done tasks out even when `status` or
 * `includeDone` would otherwise let them in. The other buckets only read the
 * date and leave the done rule to `includeDone` and `status`.
 */
export const dueConditions = (bucket: DueBucket, today: string): Filter[] => {
  const { start, end } = dayBounds(today);
  const byBucket: Record<DueBucket, Filter[]> = {
    overdue: [{ dueDate: { $lt: start } }, { status: { $ne: 'done' } }],
    today: [{ dueDate: { $gte: start, $lt: end } }],
    upcoming: [{ dueDate: { $gte: end } }],
    none: [{ dueDate: null }],
  };
  return byBucket[bucket];
};

/** Who a task is assigned to: a person, the caller (`me`), or nobody (`none`). */
const assigneeCondition = (assigneeId: string, actorId: string): Filter => {
  if (assigneeId === 'none') {
    return { assigneeIds: { $size: 0 } };
  }
  const id = assigneeId === 'me' ? actorId : assigneeId;
  // A caller whose token names no real account has no tasks of their own.
  return OBJECT_ID.test(id) ? { assigneeIds: new Types.ObjectId(id) } : { _id: null };
};

const projectCondition = (projectId: string): Filter =>
  projectId === 'none' ? { projectId: null } : { projectId: new Types.ObjectId(projectId) };

/**
 * Whether finished work is left out when no status is asked for.
 *
 * - The list hides done tasks unless `includeDone=true`: it is a list of work
 *   to do, and done work would bury it within weeks.
 * - The board shows them unless `includeDone=false`, because it has a Done
 *   column, and an empty one would look broken.
 *
 * Either way a `status` filter wins: asking for `status=done` shows done
 * tasks, and asking for `status=todo` shows only those.
 */
export type DoneRule = 'hide-unless-included' | 'show-unless-excluded';

const hidesDone = (includeDone: boolean | undefined, rule: DoneRule): boolean =>
  rule === 'hide-unless-included' ? includeDone !== true : includeDone === false;

/**
 * The MongoDB filter for the shared task filters.
 *
 * `actorId` is the signed-in caller, from the token, which is what
 * `assigneeId=me` resolves to. `today` falls back to the server's UTC date;
 * browsers send their own (`localDateKey`), which is what "today" means to
 * the person looking.
 */
export const buildTaskFilter = (
  query: TaskBoardQuery,
  actorId: string,
  doneRule: DoneRule,
): Filter => {
  const conditions: Filter[] = [];
  if (!query.includeArchived) {
    conditions.push({ archivedAt: null });
  }
  if (query.q) {
    // A key such as IAA-42 is matched as text too, so a partial key finds it.
    conditions.push({ $or: [{ title: searchRegex(query.q) }, { key: searchRegex(query.q) }] });
  }
  if (query.status && query.status.length > 0) {
    conditions.push({ status: { $in: query.status } });
  } else if (hidesDone(query.includeDone, doneRule)) {
    conditions.push({ status: { $ne: 'done' } });
  }
  if (query.priority) {
    conditions.push({ priority: query.priority });
  }
  if (query.assigneeId) {
    conditions.push(assigneeCondition(query.assigneeId, actorId));
  }
  if (query.projectId) {
    conditions.push(projectCondition(query.projectId));
  }
  if (query.due) {
    conditions.push(...dueConditions(query.due, query.today ?? todayKey()));
  }
  if (query.label) {
    // Labels are typed freely, so `Finance` and `finance` are the same label.
    conditions.push({ labels: new RegExp(`^${escapeRegex(query.label)}$`, 'i') });
  }
  return conditions.length > 0 ? { $and: conditions } : {};
};

/** The four counts behind the caller's summary: open work of theirs only. */
export const summaryFilters = (
  actorId: string,
  today: string,
): Record<'overdue' | 'dueToday' | 'upcoming' | 'open', Filter> => {
  const open: Filter = {
    ...assigneeCondition(actorId, actorId),
    archivedAt: null,
    status: { $ne: 'done' },
  };
  const { start, end } = dayBounds(today);
  return {
    overdue: { ...open, dueDate: { $lt: start } },
    dueToday: { ...open, dueDate: { $gte: start, $lt: end } },
    upcoming: { ...open, dueDate: { $gte: end } },
    open,
  };
};

type SortSpec = Record<string, 1 | -1>;

/**
 * How each sort orders the list. Every one ends on a unique field, so paging
 * never shows a task twice or skips one when two tasks tie.
 *
 * Tasks with no due date come last whichever way the due sort runs: "due
 * soonest" and "due latest" are both questions about dated work.
 */
const SORTS: Record<TaskSort, (direction: 1 | -1) => SortSpec> = {
  due: (direction) => ({ _dueMissing: 1, dueDate: direction, number: direction }),
  updated: (direction) => ({ updatedAt: direction, _id: direction }),
  // Stored priorities are words, which sort as high, low, medium, urgent; the
  // rank puts urgent at the top of a descending list.
  priority: (direction) => ({ _priorityRank: direction, _dueMissing: 1, dueDate: 1, number: -1 }),
  created: (direction) => ({ createdAt: direction, _id: direction }),
  key: (direction) => ({ number: direction }),
};

export const taskSortSpec = (sort: TaskSort, order: SortOrder): SortSpec =>
  SORTS[sort](order === 'asc' ? 1 : -1);

/** Board columns run top to bottom by position, ties broken by age. */
export const BOARD_SORT: SortSpec = { boardOrder: 1, _id: 1 };

const nonEmpty = (field: string) => ({ $ifNull: [field, []] });

/**
 * Only what a list row or a board card shows: the long description, the
 * checklist and the files stay behind, and come back as counts.
 */
const LIST_ITEM_PROJECTION = {
  key: 1,
  number: 1,
  title: 1,
  status: 1,
  priority: 1,
  assigneeIds: 1,
  projectId: 1,
  milestoneId: 1,
  startDate: 1,
  dueDate: 1,
  estimateHours: 1,
  labels: 1,
  parentTaskId: 1,
  boardOrder: 1,
  commentCount: 1,
  completedAt: 1,
  archivedAt: 1,
  createdAt: 1,
  updatedAt: 1,
  checklistTotal: { $size: nonEmpty('$checklist') },
  checklistDone: {
    $size: {
      $filter: { input: nonEmpty('$checklist'), as: 'item', cond: { $eq: ['$$item.done', true] } },
    },
  },
  attachmentCount: { $size: nonEmpty('$attachments') },
};

/**
 * One page of list rows or board cards: match, sort, cut, and reduce each task
 * to its row. The sort keys that are not stored (priority rank, a missing due
 * date) are worked out on the way.
 */
export const listItemPipeline = (
  match: Filter,
  sort: SortSpec,
  skip: number,
  limit: number,
): PipelineStage[] => [
  { $match: match },
  {
    $addFields: {
      _priorityRank: { $indexOfArray: [[...WORK_PRIORITIES], '$priority'] },
      _dueMissing: { $cond: [{ $eq: [{ $ifNull: ['$dueDate', null] }, null] }, 1, 0] },
    },
  },
  { $sort: sort },
  { $skip: skip },
  { $limit: limit },
  { $project: LIST_ITEM_PROJECTION },
];
