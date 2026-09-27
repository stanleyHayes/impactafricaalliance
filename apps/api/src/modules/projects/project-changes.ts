import {
  calendarDateKey,
  canTransitionProject,
  PROJECT_STATUS_LABELS,
  projectDateProblem,
  toCalendarDateIso,
  type ProjectInput,
  type ProjectMediaUpdate,
  type ProjectStatus,
  type ProjectUpdate,
} from '@iaa/shared';
import { Types } from 'mongoose';

import { ConflictError, ValidationError } from '../../common/errors.js';

import type { ProjectMediaRecord, ProjectMilestoneRecord, ProjectRecord } from './project.model.js';

/**
 * The pure half of a project write: turning a validated request into the
 * document or update operators to store, and refusing moves the rules forbid.
 * Kept apart from the service so the rules can be tested without a database.
 */

/** A project as `lean()` returns it. */
export type StoredProject = ProjectRecord & { _id: Types.ObjectId };

/**
 * Optional fields a PATCH clears with null.
 *
 * Cleared fields are removed from the document (`$unset`) rather than stored
 * as null, so "never set" and "cleared" are the same on disk and every reader
 * treats them alike. The DTO then states them one way: nullable fields
 * (`leadId`, `programme`, dates, `cover`, `progressOverride`) come back as
 * null, and optional text (`code`, `country`, `region`, `locationText`) is
 * left out.
 */
export const CLEARABLE_PROJECT_FIELDS = [
  'code',
  'leadId',
  'programme',
  'startDate',
  'endDate',
  'country',
  'region',
  'locationText',
  'cover',
  'progressOverride',
] as const;

const CLEARABLE = new Set<string>(CLEARABLE_PROJECT_FIELDS);

/**
 * Update operators for one project. `$unset` is only sent when it holds
 * something, because an empty `$unset` is refused by MongoDB.
 */
export interface ProjectWrite {
  $set: Record<string, unknown>;
  $unset?: Record<string, 1>;
}

type MilestoneInput = ProjectInput['milestones'][number];
type MetricInput = ProjectInput['metrics'][number];

/**
 * A calendar day as the database keeps it: noon UTC on that day (plan D6).
 * The schema accepts any ISO instant, so a client that sent local midnight
 * as UTC would otherwise store a time that reads as the day before for part
 * of the team. The tasks module stores its days the same way, so a task due
 * on a milestone's day compares as the same day.
 */
export const toCalendarDay = (value: string): Date =>
  new Date(toCalendarDateIso(calendarDateKey(value)));

/** Stored as a calendar day; an absent or cleared date is left out. */
const toDate = (value: string | null | undefined): Date | undefined =>
  value ? toCalendarDay(value) : undefined;

/**
 * Lists where an entry means something only once: a colleague, a goal, a
 * tag. The dashboard never sends a repeat, but a repeated member would show
 * twice on the team and count twice in "My projects".
 */
const DISTINCT_LISTS = new Set(['memberIds', 'sdgs', 'tags']);

const distinct = <T>(items: readonly T[]): T[] => [...new Set(items)];

/** A user id from the token, when it is one; see `AuditService` for why this is checked. */
export const actorObjectId = (id: string): Types.ObjectId | undefined =>
  Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id) ? new Types.ObjectId(id) : undefined;

/**
 * Milestones as stored, with `completedAt` kept by the server: stamped when
 * an item first reaches done, kept while it stays done, and dropped when it
 * leaves. Whatever the client sent for it is ignored, so the date always
 * means "when this was actually finished".
 */
export const stampMilestones = (
  previous: readonly ProjectMilestoneRecord[],
  next: readonly MilestoneInput[],
  now: Date,
): ProjectMilestoneRecord[] => {
  const before = new Map(previous.map((item) => [item.id, item]));
  return next.map((item) => {
    const earlier = before.get(item.id);
    const keptCompletion =
      earlier?.status === 'done' && earlier.completedAt ? earlier.completedAt : now;
    const dueDate = toDate(item.dueDate);
    return {
      id: item.id,
      kind: item.kind,
      title: item.title,
      ...(item.description ? { description: item.description } : {}),
      ...(dueDate ? { dueDate } : {}),
      status: item.status,
      ...(item.status === 'done' ? { completedAt: keptCompletion } : {}),
    };
  });
};

/** Metrics as stored: a missing target is left out rather than kept as null. */
const storeMetrics = (metrics: readonly MetricInput[]): Record<string, unknown>[] =>
  metrics.map(({ target, ...metric }) =>
    typeof target === 'number' ? { ...metric, target } : metric,
  );

/** Refuses a move the lifecycle does not allow, naming both ends. */
export const assertTransition = (from: ProjectStatus, to: ProjectStatus): void => {
  if (!canTransitionProject(from, to)) {
    throw new ConflictError(
      `A project cannot move from ${PROJECT_STATUS_LABELS[from]} to ${PROJECT_STATUS_LABELS[to]}.`,
    );
  }
};

const assertDates = (start?: Date | string | null, end?: Date | string | null): void => {
  const problem = projectDateProblem(
    start instanceof Date ? start.toISOString() : start,
    end instanceof Date ? end.toISOString() : end,
  );
  if (problem) {
    throw new ValidationError(problem, [{ path: 'endDate', message: problem }]);
  }
};

/**
 * The document for a new project. Optional values that are empty are left out
 * (see `CLEARABLE_PROJECT_FIELDS`), dates become Dates, and the creator is
 * stamped from the signed-in user, never from the body.
 */
export const buildProjectCreate = (
  input: ProjectInput,
  actorId: string,
  now: Date,
): Record<string, unknown> => {
  assertDates(toDate(input.startDate), toDate(input.endDate));
  const actor = actorObjectId(actorId);
  const { milestones, metrics, startDate, endDate, ...rest } = input;
  const doc: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== null && value !== undefined) {
      doc[key] = DISTINCT_LISTS.has(key) ? distinct(value as unknown[]) : value;
    }
  }
  return {
    ...doc,
    ...(startDate ? { startDate: toCalendarDay(startDate) } : {}),
    ...(endDate ? { endDate: toCalendarDay(endDate) } : {}),
    milestones: stampMilestones([], milestones, now),
    metrics: storeMetrics(metrics),
    ...(input.status === 'archived' ? { archivedAt: now } : {}),
    ...(actor ? { createdBy: actor, updatedBy: actor } : {}),
  };
};

/** True when a PATCH leaves the status where it is. */
const sameStatus = (before: StoredProject, patch: ProjectUpdate): boolean =>
  patch.status === undefined || patch.status === before.status;

const statusOperators = (
  before: StoredProject,
  to: ProjectStatus,
  now: Date,
): { set: Record<string, unknown>; unset: string[] } => {
  if (to === 'archived') {
    return { set: { archivedAt: now, archivedFromStatus: before.status }, unset: [] };
  }
  if (before.status === 'archived') {
    return { set: {}, unset: ['archivedAt', 'archivedFromStatus'] };
  }
  return { set: {}, unset: [] };
};

const storedValue = (key: string, value: unknown, before: StoredProject, now: Date): unknown => {
  if (key === 'startDate' || key === 'endDate') {
    return toCalendarDay(value as string);
  }
  if (DISTINCT_LISTS.has(key)) {
    return distinct(value as unknown[]);
  }
  if (key === 'milestones') {
    return stampMilestones(before.milestones ?? [], value as MilestoneInput[], now);
  }
  if (key === 'metrics') {
    return storeMetrics(value as MetricInput[]);
  }
  return value;
};

/**
 * Update operators for a PATCH, after checking what depends on the stored
 * record: the status move is allowed, and the merged start and end dates are
 * in order (a PATCH may move only one of them).
 *
 * Absent keys are left alone; null on a clearable field removes it.
 * Archiving stamps `archivedAt` and remembers the status it came from;
 * leaving archived clears both.
 */
export const buildProjectUpdate = (
  before: StoredProject,
  patch: ProjectUpdate,
  actorId: string,
  now: Date,
): ProjectWrite => {
  if (!sameStatus(before, patch)) {
    assertTransition(before.status, patch.status as ProjectStatus);
  }
  // Compared as the days that will be stored, so two instants on the same
  // day never read as the end coming first.
  const start = patch.startDate === undefined ? before.startDate : toDate(patch.startDate);
  const end = patch.endDate === undefined ? before.endDate : toDate(patch.endDate);
  assertDates(start, end);

  const set: Record<string, unknown> = {};
  const unset: string[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null) {
      // Only clearable fields accept null; the schema refuses it elsewhere.
      if (CLEARABLE.has(key)) unset.push(key);
      continue;
    }
    set[key] = storedValue(key, value, before, now);
  }
  if (!sameStatus(before, patch)) {
    const status = statusOperators(before, patch.status as ProjectStatus, now);
    Object.assign(set, status.set);
    unset.push(...status.unset);
  }
  const actor = actorObjectId(actorId);
  if (actor) set.updatedBy = actor;
  return unset.length > 0
    ? { $set: set, $unset: Object.fromEntries(unset.map((key) => [key, 1 as const])) }
    : { $set: set };
};

/**
 * Milestones a PATCH takes off the plan: ids the project had that the new
 * list leaves out. Tasks may still point at them (`Task.milestoneId`), and
 * those links are cleared once the project is saved, so a task never names a
 * milestone that no longer exists (see `ProjectService.update`).
 */
export const removedMilestoneIds = (
  before: Pick<StoredProject, 'milestones'>,
  patch: Pick<ProjectUpdate, 'milestones'>,
): string[] => {
  if (!patch.milestones) return [];
  const kept = new Set(patch.milestones.map((item) => item.id));
  return (before.milestones ?? []).map((item) => item.id).filter((id) => !kept.has(id));
};

/** What moving from one status to another is called in the activity log. */
export const statusAuditAction = (
  from: ProjectStatus,
  to: ProjectStatus,
): 'archived' | 'restored' | 'status-changed' => {
  if (to === 'archived') return 'archived';
  if (from === 'archived') return 'restored';
  return 'status-changed';
};

/** One line for the activity log about a status move. */
export const statusAuditSummary = (from: ProjectStatus, to: ProjectStatus): string => {
  const action = statusAuditAction(from, to);
  if (action === 'archived') {
    return `Archived the project (it was ${PROJECT_STATUS_LABELS[from]})`;
  }
  if (action === 'restored') {
    return `Restored the project to ${PROJECT_STATUS_LABELS[to]}`;
  }
  return `Moved the project from ${PROJECT_STATUS_LABELS[from]} to ${PROJECT_STATUS_LABELS[to]}`;
};

/**
 * Fields whose changes the activity log records, with the words it uses for
 * them. Status is logged on its own line (see `statusAuditSummary`), and the
 * evidence lists have their own endpoints and entries.
 */
export const AUDITED_PROJECT_FIELDS: Record<string, string> = {
  title: 'title',
  slug: 'address',
  code: 'reference code',
  summary: 'summary',
  description: 'description',
  priority: 'priority',
  leadId: 'lead',
  memberIds: 'members',
  programme: 'programme',
  startDate: 'start date',
  endDate: 'end date',
  country: 'country',
  region: 'region',
  locationText: 'location',
  objectives: 'objectives',
  partners: 'partners',
  tags: 'tags',
  sdgs: 'SDGs',
  cover: 'cover image',
  milestones: 'milestones',
  metrics: 'metrics',
  risks: 'risks',
  progressOverride: 'progress figure',
};

/** "a", "a and b", "a, b and c". */
export const listInWords = (items: readonly string[]): string => {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1) ?? ''}`;
};

/** One line for the activity log about an edit, from the fields that changed. */
export const updateAuditSummary = (fields: readonly string[]): string =>
  `Edited the ${listInWords(fields.map((field) => AUDITED_PROJECT_FIELDS[field] ?? field))}`;

/** "1 task", "3 tasks". */
export const countOf = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/**
 * Why a project cannot be deleted, or null when nothing points at it.
 * Deleting would leave tasks and stories pointing at nothing, so the answer
 * is always to archive instead (plan D5).
 */
export const deleteRefusal = (tasks: number, stories: number): string | null => {
  const links = [
    tasks > 0 ? countOf(tasks, 'task') : null,
    stories > 0 ? countOf(stories, 'impact story', 'impact stories') : null,
  ].filter((link): link is string => link !== null);
  if (links.length === 0) return null;
  return (
    `This project has ${listInWords(links)} linked to it. Archive it instead: ` +
    'it leaves every list, and its tasks and stories keep their link.'
  );
};

// The photo details a PATCH may change; the picture itself never changes.
const MEDIA_PATCH_FIELDS = ['caption', 'takenOn', 'shareable'] as const;

/**
 * Positional operators (`media.$`) for one photo's details. Null removes a
 * caption or date, as it does on the project itself.
 */
export const mediaPatchOperators = (patch: ProjectMediaUpdate, actorId: string): ProjectWrite => {
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  for (const field of MEDIA_PATCH_FIELDS) {
    const value = patch[field];
    if (value === undefined) continue;
    if (value === null) unset[`media.$.${field}`] = 1;
    else set[`media.$.${field}`] = field === 'takenOn' ? toCalendarDay(value as string) : value;
  }
  const actor = actorObjectId(actorId);
  if (actor) set.updatedBy = actor;
  return Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set };
};

/** A stored photo with a PATCH applied, for the response and the log. */
export const applyMediaPatch = (
  item: ProjectMediaRecord,
  patch: ProjectMediaUpdate,
): ProjectMediaRecord => {
  const next: ProjectMediaRecord = { ...item };
  if (patch.caption !== undefined) next.caption = patch.caption ?? undefined;
  if (patch.takenOn !== undefined)
    next.takenOn = patch.takenOn ? toCalendarDay(patch.takenOn) : null;
  if (patch.shareable !== undefined) next.shareable = patch.shareable;
  return next;
};

/** One line for the log about a photo whose details changed. */
export const mediaUpdateSummary = (
  before: Pick<ProjectMediaRecord, 'shareable'>,
  after: Pick<ProjectMediaRecord, 'shareable' | 'caption'>,
): string => {
  const name = after.caption ? `"${after.caption}"` : 'a photo';
  if (before.shareable !== after.shareable) {
    return after.shareable ? `Cleared ${name} for public use` : `Withdrew ${name} from public use`;
  }
  return `Edited the details of ${name}`;
};
