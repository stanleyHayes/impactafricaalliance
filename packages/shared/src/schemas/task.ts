import { z } from 'zod';

import {
  clearableDate,
  objectIdSchema,
  paginationQuerySchema,
  type Timestamped,
} from './common.js';
import { type ProjectRef } from './project.js';
import { partialForUpdate } from './update.js';
import {
  booleanQueryParam,
  calendarDateSchema,
  commaList,
  DUE_BUCKETS,
  fileAttachmentInputSchema,
  hasUniqueIds,
  optionalTextField,
  SORT_ORDERS,
  stableIdSchema,
  WORK_PRIORITIES,
  type FileAttachment,
  type PersonSummary,
  type WorkPriority,
} from './work.js';

/**
 * Tasks are the team's day-to-day work: a light board and list in the style of
 * Linear or Jira, joined to people and, optionally, to a project. A task can
 * exist on its own for administrative work that belongs to no project.
 */

export const TASK_STATUSES = [
  'backlog',
  'todo',
  'in-progress',
  'review',
  'done',
  'blocked',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Board columns, left to right. Blocked sits beside In progress, where the
 * work got stuck, rather than at the far end where nobody looks.
 */
export const TASK_BOARD_COLUMNS: readonly TaskStatus[] = [
  'backlog',
  'todo',
  'in-progress',
  'blocked',
  'review',
  'done',
];

/** Cards each board column returns; the column also reports its full total. */
export const TASK_BOARD_COLUMN_LIMIT = 100;

/** Most documents one task can carry. */
export const TASK_ATTACHMENT_LIMIT = 20;

/** Most checklist lines one task can carry. */
export const TASK_CHECKLIST_LIMIT = 50;

/** True while a task still needs doing. */
export const isTaskOpen = (status: TaskStatus): boolean => status !== 'done';

/**
 * Any status may move to any other. This is a board, not an approval
 * workflow: work gets reopened, skips review, or turns out to be blocked, and
 * the board should record that rather than argue with it. The function exists
 * so the rule has one home if that ever changes.
 */
export const canTransitionTask = (_from: TaskStatus, _to: TaskStatus): boolean => true;

/** Every task key starts with this, so `IAA-42` reads as ours in any chat or email. */
export const TASK_KEY_PREFIX = 'IAA';
export const TASK_KEY_PATTERN = /^IAA-[1-9]\d*$/;

/** The human key for a task's sequence number: 42 becomes `IAA-42`. */
export const formatTaskKey = (n: number): string => `${TASK_KEY_PREFIX}-${n}`;

/**
 * The sequence number in a key, or null when the text is not a key. Accepts
 * any case, since people type `iaa-42` into a URL as often as `IAA-42`.
 * Numbers too long to hold exactly are not keys either: `IAA-` followed by
 * twenty nines would otherwise round to a different task's number.
 */
export const parseTaskKey = (value: string): number | null => {
  const key = value.trim().toUpperCase();
  if (!TASK_KEY_PATTERN.test(key)) {
    return null;
  }
  const n = Number(key.slice(TASK_KEY_PREFIX.length + 1));
  return Number.isSafeInteger(n) ? n : null;
};

/** One line of a task's checklist, as stored and sent back whole with a new task. */
export const checklistItemSchema = z.object({
  id: stableIdSchema,
  text: z.string().trim().min(1).max(300),
  done: z.boolean().default(false),
});

/** Adding a checklist line to an existing task. The API assigns the id. */
export const checklistItemInputSchema = z.object({
  text: z.string().trim().min(1).max(300),
});
export type ChecklistItemInput = z.infer<typeof checklistItemInputSchema>;

/** Ticking or rewording one checklist line. No defaults: absent means unchanged. */
export const checklistItemPatchSchema = z.object({
  text: z.string().trim().min(1).max(300).optional(),
  done: z.boolean().optional(),
});
export type ChecklistItemPatch = z.infer<typeof checklistItemPatchSchema>;

/**
 * Creating or editing a task.
 *
 * Start and due dates are calendar days stored at noon UTC (see
 * `toCalendarDateIso`). The API checks that every referenced project,
 * milestone, person, parent and dependency exists, and that people are
 * active, because none of those ids can be trusted from a browser.
 */
export const taskInputSchema = z.object({
  title: z.string().trim().min(3).max(200),
  /** Markdown. */
  description: z.string().trim().max(20000).default(''),
  status: z.enum(TASK_STATUSES).default('todo'),
  priority: z.enum(WORK_PRIORITIES).default('medium'),
  assigneeIds: z.array(objectIdSchema).max(10).default([]),
  projectId: objectIdSchema.nullable().optional(),
  /** A milestone or activity on the task's project. */
  milestoneId: stableIdSchema.nullable().optional(),
  startDate: clearableDate.optional(),
  dueDate: clearableDate.optional(),
  estimateHours: z.number().min(0).max(1000).nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  checklist: z
    .array(checklistItemSchema)
    .max(TASK_CHECKLIST_LIMIT)
    .refine(hasUniqueIds, 'Each checklist item needs its own id')
    .default([]),
  /** Makes this a subtask of another task. */
  parentTaskId: objectIdSchema.nullable().optional(),
  /** Tasks that must finish before this one can. */
  dependencyIds: z.array(objectIdSchema).max(20).default([]),
});
export type TaskInput = z.infer<typeof taskInputSchema>;

/**
 * Editing a task. The checklist is left out because it has its own endpoints:
 * two people ticking items at once would otherwise overwrite each other's
 * ticks. Explicit null clears an optional field; omission leaves it alone.
 */
export const taskUpdateSchema = partialForUpdate(taskInputSchema.omit({ checklist: true }));
export type TaskUpdate = z.infer<typeof taskUpdateSchema>;

/**
 * A board move: where the card ended up, not how it got there. Sending the
 * absolute result makes the request safe for the API client to retry.
 */
export const taskMoveSchema = z.object({
  status: z.enum(TASK_STATUSES),
  boardOrder: z.number(),
});
export type TaskMove = z.infer<typeof taskMoveSchema>;

/**
 * A comment. Mentions are written as tokens, `@[Ama Mensah](<user id>)`, which
 * the dashboard's mention picker inserts; the API finds them with
 * `extractMentionIds`, checks each person is an active colleague and stores
 * their ids. See `TASK_MENTION_PATTERN`.
 */
export const taskCommentInputSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});
export type TaskCommentInput = z.infer<typeof taskCommentInputSchema>;

/** Most colleagues one comment can mention. */
export const TASK_MENTION_LIMIT = 20;

/**
 * A mention token inside a comment: `@[Display Name](64b7f0c2a1b2c3d4e5f60718)`.
 *
 * A token rather than a bare `@name`, because names are not unique and change:
 * the id says exactly who was meant, and the name keeps the text readable in
 * an email or an export that does not resolve it. The name may not hold
 * brackets or a line break, so a token always ends where it seems to.
 */
export const TASK_MENTION_PATTERN = /@\[([^[\]\n]{1,100})\]\(([a-f\d]{24})\)/gi;

// A fresh copy each time: a global pattern keeps its position between calls,
// so sharing one would make every other search start half-way through.
const mentionPattern = (): RegExp =>
  new RegExp(TASK_MENTION_PATTERN.source, TASK_MENTION_PATTERN.flags);

/** Characters a display name cannot carry inside a token. */
const MENTION_NAME_UNSAFE = /[[\]()\n\r]+/g;

/**
 * The token that mentions `person`. Brackets and line breaks in the name are
 * dropped, so an unusual name can never end the token early.
 */
export const mentionToken = (person: { id: string; name: string }): string => {
  const name = person.name.replace(MENTION_NAME_UNSAFE, ' ').replace(/\s+/g, ' ').trim();
  return `@[${(name || 'colleague').slice(0, 100)}](${person.id.toLowerCase()})`;
};

/**
 * The ids mentioned in a comment, lower-cased, each once, in the order they
 * first appear. Only well-formed tokens count; typing `@Ama` names nobody.
 */
export const extractMentionIds = (body: string): string[] => {
  const ids = new Set<string>();
  for (const match of body.matchAll(mentionPattern())) {
    const id = match[2];
    if (id) ids.add(id.toLowerCase());
  }
  return [...ids];
};

/**
 * A comment with each token replaced by `@Display Name`, for anywhere the
 * text is shown without the dashboard's mention styling: an activity line, a
 * notification, a plain-text preview.
 */
export const mentionsToText = (body: string): string =>
  body.replace(mentionPattern(), (_token, name: string) => `@${name}`);

/**
 * `PATCH /api/admin/tasks/:id/archive`. Archiving hides a task from every list
 * and the board without deleting it; restoring brings it back as it was.
 */
export const taskArchiveSchema = z.object({
  archived: z.boolean(),
});
export type TaskArchive = z.infer<typeof taskArchiveSchema>;

/** Attaching a document to a task. */
export const taskAttachmentInputSchema = fileAttachmentInputSchema;
export type TaskAttachmentInput = z.infer<typeof taskAttachmentInputSchema>;

export const TASK_SORTS = ['due', 'updated', 'priority', 'created', 'key'] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

/**
 * Filters shared by the list and the board.
 *
 * - `assigneeId`: a person, `me`, or `none` for unassigned work.
 * - `projectId`: a project, or `none` for work outside any project.
 * - `due` buckets against `today`, the caller's own calendar day; the server
 *   falls back to its UTC date, which is wrong for anyone far from Greenwich
 *   late in their day.
 * - Archived tasks are hidden unless `includeArchived=true`. Done tasks are
 *   hidden from the list unless `includeDone=true`, or unless `status` asks
 *   for them.
 */
const taskFilterShape = {
  q: optionalTextField(80),
  status: commaList(z.enum(TASK_STATUSES), TASK_STATUSES.length).optional(),
  priority: z.enum(WORK_PRIORITIES).optional(),
  assigneeId: z.union([z.literal('me'), z.literal('none'), objectIdSchema]).optional(),
  projectId: z.union([z.literal('none'), objectIdSchema]).optional(),
  due: z.enum(DUE_BUCKETS).optional(),
  today: calendarDateSchema.optional(),
  label: optionalTextField(40),
  includeArchived: booleanQueryParam,
  includeDone: booleanQueryParam,
};

/** `GET /api/admin/tasks`. */
export const taskListQuerySchema = paginationQuerySchema.extend({
  ...taskFilterShape,
  sort: z.enum(TASK_SORTS).default('updated'),
  order: z.enum(SORT_ORDERS).default('desc'),
});
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

/** `GET /api/admin/tasks/board`: the same filters, each column in board order. */
export const taskBoardQuerySchema = z.object(taskFilterShape);
export type TaskBoardQuery = z.infer<typeof taskBoardQuerySchema>;

/** `GET /api/admin/tasks/summary`. `today` is the caller's calendar day. */
export const taskSummaryQuerySchema = z.object({
  today: calendarDateSchema.optional(),
});
export type TaskSummaryQuery = z.infer<typeof taskSummaryQuerySchema>;

/** A checklist line as the task page shows it, with who ticked it. */
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  doneAt?: string | null;
  doneBy?: PersonSummary | null;
}

/** Enough of a task to name and link it: a parent, a dependency, a subtask. */
export interface TaskRef {
  id: string;
  key: string;
  title: string;
  status: TaskStatus;
}

/** The milestone a task belongs to, named for display. */
export interface TaskMilestoneRef {
  id: string;
  title: string;
}

/** A task as its detail page and drawer see it. */
export interface Task extends Timestamped {
  key: string;
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: WorkPriority;
  assigneeIds: string[];
  assignees: PersonSummary[];
  /** Whoever created the task. */
  reporter: PersonSummary | null;
  projectId?: string | null;
  project?: ProjectRef | null;
  milestoneId?: string | null;
  milestone?: TaskMilestoneRef | null;
  startDate?: string | null;
  dueDate?: string | null;
  estimateHours?: number | null;
  labels: string[];
  checklist: ChecklistItem[];
  attachments: FileAttachment[];
  parentTaskId?: string | null;
  parent?: TaskRef | null;
  dependencyIds: string[];
  dependencies: TaskRef[];
  subtasks?: TaskRef[];
  /** Position within its board column; see `boardOrderBetween`. */
  boardOrder: number;
  commentCount: number;
  /** Set on entering `done`, cleared on leaving it. */
  completedAt?: string | null;
  archivedAt?: string | null;
  updatedBy?: PersonSummary | null;
}

/** A task as a list row or board card: counts instead of the long parts. */
export interface TaskListItem extends Timestamped {
  key: string;
  number: number;
  title: string;
  status: TaskStatus;
  priority: WorkPriority;
  assigneeIds: string[];
  assignees: PersonSummary[];
  projectId?: string | null;
  project?: ProjectRef | null;
  milestoneId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  estimateHours?: number | null;
  labels: string[];
  parentTaskId?: string | null;
  boardOrder: number;
  commentCount: number;
  checklistDone: number;
  checklistTotal: number;
  attachmentCount: number;
  completedAt?: string | null;
  archivedAt?: string | null;
}

/** A comment on a task. */
export interface TaskComment {
  id: string;
  taskId: string;
  /** Null when the author's account has since been removed. */
  author: PersonSummary | null;
  /** Markdown, with mentions as tokens; see `TASK_MENTION_PATTERN` and `mentionsToText`. */
  body: string;
  /** Ids of the colleagues mentioned in the text, checked as active when it was saved. */
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}

/** One board column: its first cards in order, and how many there are in all. */
export interface TaskBoardColumn {
  status: TaskStatus;
  total: number;
  items: TaskListItem[];
}

/** The board, one column per status in `TASK_BOARD_COLUMNS` order. */
export interface TaskBoard {
  columns: TaskBoardColumn[];
}

/** The caller's own open work, for the nav badge and the dashboard. */
export interface TaskSummary {
  overdue: number;
  dueToday: number;
  upcoming: number;
  open: number;
}
