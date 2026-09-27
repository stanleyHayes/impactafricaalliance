import type { AuditChange } from '@iaa/shared';
import type { Types } from 'mongoose';

import { AUDIT_VALUE_MAX_LENGTH } from '../audit/audit-diff.js';

import { idOf, type StoredTask } from './task-presenter.js';

/**
 * Turning a task edit's audit changes into words a colleague can read.
 *
 * `diffFields` compares stored values, which for a task means ObjectIds for
 * the project, parent and dependencies, a milestone's stable id, and dates at
 * noon UTC. Shown as they are, the activity log would read "Project id:
 * 64b7f0c2… → 64c1…". This swaps each for the name a person knows it by, and
 * each date for its calendar day. Kept free of database calls: the service
 * looks the names up once and passes them in.
 */

type Side = 'from' | 'to';

/** A project as the activity log names it, with its milestones by id. */
export interface AuditProjectNames {
  title: string;
  milestones: ReadonlyMap<string, string>;
}

/** The names an edit's audit entry needs, gathered by the service. */
export interface AuditNames {
  /** The task's project before and after the edit, when it has one. */
  project: Record<Side, AuditProjectNames | null>;
  /** Task keys by id, for the parent and dependencies. */
  tasks: ReadonlyMap<string, string>;
}

/** The fields whose stored values are ids that need looking up. */
export const PROJECT_AUDIT_FIELDS = ['projectId', 'milestoneId'] as const;
export const TASK_REF_AUDIT_FIELDS = ['parentTaskId', 'dependencyIds'] as const;

// Read in UTC: a calendar date is stored at noon UTC (plan D6), so this is its day.
const DAY = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const GONE_PROJECT = 'a project that no longer exists';
const GONE_TASK = 'a deleted task';

const taskKey = (names: AuditNames, id: Types.ObjectId | string): string =>
  names.tasks.get(id.toString()) ?? GONE_TASK;

interface Readable {
  /** The name the timeline shows for the field; "parentTask" reads as "Parent task". */
  field: string;
  show: (value: unknown, side: Side, names: AuditNames) => string | null;
}

const asDate = (value: unknown): string | null =>
  value instanceof Date && !Number.isNaN(value.getTime()) ? DAY.format(value) : null;

const READABLE: Record<string, Readable> = {
  projectId: {
    field: 'project',
    show: (value, side, names) => (value ? (names.project[side]?.title ?? GONE_PROJECT) : null),
  },
  milestoneId: {
    field: 'milestone',
    show: (value, side, names) =>
      typeof value === 'string' && value
        ? (names.project[side]?.milestones.get(value) ?? 'a removed milestone')
        : null,
  },
  parentTaskId: {
    field: 'parentTask',
    show: (value, _side, names) => (value ? taskKey(names, value as Types.ObjectId) : null),
  },
  dependencyIds: {
    field: 'dependencies',
    show: (value, _side, names) => {
      const ids = Array.isArray(value) ? (value as Types.ObjectId[]) : [];
      return ids.length > 0 ? ids.map((id) => taskKey(names, id)).join(', ') : null;
    },
  },
  startDate: { field: 'startDate', show: asDate },
  dueDate: { field: 'dueDate', show: asDate },
  estimateHours: {
    field: 'estimate',
    show: (value) =>
      typeof value === 'number' ? `${value} ${value === 1 ? 'hour' : 'hours'}` : null,
  },
};

const clip = (value: string | null): string | null =>
  value !== null && value.length > AUDIT_VALUE_MAX_LENGTH
    ? `${value.slice(0, AUDIT_VALUE_MAX_LENGTH - 1)}…`
    : value;

/**
 * The audit changes for an edit with ids and dates in words. Fields that are
 * already readable (title, priority, labels, the description marker) pass
 * through untouched.
 */
export const readableTaskChanges = (
  changes: readonly AuditChange[],
  before: StoredTask,
  after: StoredTask,
  names: AuditNames,
): AuditChange[] =>
  changes.map((change) => {
    const readable = READABLE[change.field];
    if (!readable) {
      return change;
    }
    const key = change.field as keyof StoredTask;
    return {
      field: readable.field,
      from: clip(readable.show(before[key], 'from', names)),
      to: clip(readable.show(after[key], 'to', names)),
    };
  });

/** The project ids an edit's audit entry must name: before and after. */
export const projectIdsToName = (
  changes: readonly AuditChange[],
  before: StoredTask,
  after: StoredTask,
): string[] => {
  const touched = changes.some((change) =>
    (PROJECT_AUDIT_FIELDS as readonly string[]).includes(change.field),
  );
  if (!touched) {
    return [];
  }
  return [
    ...new Set([idOf(before.projectId), idOf(after.projectId)].filter((id) => id !== null)),
  ] as string[];
};

/** The task ids an edit's audit entry must name: old and new parent and dependencies. */
export const taskIdsToName = (
  changes: readonly AuditChange[],
  before: StoredTask,
  after: StoredTask,
): string[] => {
  const touched = changes.some((change) =>
    (TASK_REF_AUDIT_FIELDS as readonly string[]).includes(change.field),
  );
  if (!touched) {
    return [];
  }
  const ids = [
    before.parentTaskId,
    after.parentTaskId,
    ...(before.dependencyIds ?? []),
    ...(after.dependencyIds ?? []),
  ].map(idOf);
  return [...new Set(ids.filter((id): id is string => id !== null))];
};
