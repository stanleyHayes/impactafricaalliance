import type {
  ChecklistItem,
  FileAttachment,
  PersonSummary,
  ProjectRef,
  Task,
  TaskListItem,
  TaskMilestoneRef,
  TaskRef,
} from '@iaa/shared';
import type { Types } from 'mongoose';

import type { FileAttachmentRecord } from '../../common/work-model-helpers.js';

import type { ChecklistItemRecord, TaskDocument } from './task.model.js';

/**
 * Turning stored tasks into the DTOs in `@iaa/shared`: ids to strings, Dates
 * to ISO text, people to `PersonSummary`, projects to `ProjectRef`.
 *
 * Kept free of database calls. The query service gathers every id a page
 * needs and looks them up in one go; these functions only read the maps.
 */

/** A task as `lean()` reads it from the database. */
export type StoredTask = TaskDocument & { _id: Types.ObjectId };

/** A list row as the aggregation returns it (see `listItemPipeline`). */
export type StoredTaskRow = Omit<StoredTask, 'description' | 'checklist' | 'attachments'> & {
  checklistTotal: number;
  checklistDone: number;
  attachmentCount: number;
};

/** A project as the task pages need it: named, linked, and with its milestones. */
export interface ProjectLookup extends ProjectRef {
  milestones: TaskMilestoneRef[];
}

export interface TaskLookups {
  people: ReadonlyMap<string, PersonSummary>;
  projects: ReadonlyMap<string, ProjectLookup>;
}

/** The task's related tasks, looked up by the query service for the detail view. */
export interface TaskRelations {
  parent: TaskRef | null;
  dependencies: TaskRef[];
  subtasks: TaskRef[];
}

type IdLike = Types.ObjectId | string | null | undefined;

/** An id as text, or null for none; stored references arrive as ObjectIds. */
export const idOf = (value: IdLike): string | null => (value ? value.toString() : null);

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

const personOf = (lookups: TaskLookups, id: IdLike): PersonSummary | null => {
  const key = idOf(id);
  return key ? (lookups.people.get(key) ?? null) : null;
};

/**
 * Assignees in the order they were added. Someone whose account has since
 * been removed drops out of `assignees` but stays in `assigneeIds`, so the
 * page can say a name is missing rather than silently losing it.
 */
const peopleOf = (lookups: TaskLookups, ids: readonly IdLike[]): PersonSummary[] =>
  ids.flatMap((id) => {
    const person = personOf(lookups, id);
    return person ? [person] : [];
  });

const projectRefOf = (lookups: TaskLookups, projectId: IdLike): ProjectRef | null => {
  const project = lookups.projects.get(idOf(projectId) ?? '');
  return project ? { id: project.id, title: project.title, slug: project.slug } : null;
};

const milestoneOf = (
  lookups: TaskLookups,
  projectId: IdLike,
  milestoneId: string | null | undefined,
): TaskMilestoneRef | null => {
  if (!milestoneId) {
    return null;
  }
  const project = lookups.projects.get(idOf(projectId) ?? '');
  return project?.milestones.find((milestone) => milestone.id === milestoneId) ?? null;
};

/** Every person a set of tasks names, for one directory lookup. */
export const peopleIdsOf = (tasks: readonly Partial<StoredTask>[]): Types.ObjectId[] =>
  tasks.flatMap((task) => [
    ...(task.assigneeIds ?? []),
    ...(task.createdBy ? [task.createdBy] : []),
    ...(task.updatedBy ? [task.updatedBy] : []),
    ...(task.checklist ?? []).flatMap((item) => (item.doneBy ? [item.doneBy] : [])),
    ...(task.attachments ?? []).flatMap((file) => (file.addedBy ? [file.addedBy] : [])),
  ]);

/** A related task, named and linked: a parent, a dependency, a subtask. */
export const toTaskRef = (task: Pick<StoredTask, '_id' | 'key' | 'title' | 'status'>): TaskRef => ({
  id: task._id.toString(),
  key: task.key,
  title: task.title,
  status: task.status,
});

const toChecklistItem = (lookups: TaskLookups, item: ChecklistItemRecord): ChecklistItem => ({
  id: item.id,
  text: item.text,
  done: item.done,
  doneAt: iso(item.doneAt),
  doneBy: personOf(lookups, item.doneBy),
});

const toAttachment = (lookups: TaskLookups, file: FileAttachmentRecord): FileAttachment => ({
  id: file.id,
  name: file.name,
  file: file.file,
  addedBy: personOf(lookups, file.addedBy),
  addedAt: file.addedAt.toISOString(),
});

/** The fields a row and the full task share. */
const commonFields = (task: StoredTask | StoredTaskRow, lookups: TaskLookups) => ({
  id: task._id.toString(),
  key: task.key,
  number: task.number,
  title: task.title,
  status: task.status,
  priority: task.priority,
  assigneeIds: (task.assigneeIds ?? []).map((id) => id.toString()),
  assignees: peopleOf(lookups, task.assigneeIds ?? []),
  projectId: idOf(task.projectId),
  project: projectRefOf(lookups, task.projectId),
  milestoneId: task.milestoneId ?? null,
  startDate: iso(task.startDate),
  dueDate: iso(task.dueDate),
  estimateHours: task.estimateHours ?? null,
  labels: task.labels ?? [],
  parentTaskId: idOf(task.parentTaskId),
  boardOrder: task.boardOrder,
  commentCount: task.commentCount ?? 0,
  completedAt: iso(task.completedAt),
  archivedAt: iso(task.archivedAt),
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
});

/** A list row or board card. */
export const toTaskListItem = (row: StoredTaskRow, lookups: TaskLookups): TaskListItem => ({
  ...commonFields(row, lookups),
  checklistDone: row.checklistDone,
  checklistTotal: row.checklistTotal,
  attachmentCount: row.attachmentCount,
});

/** The whole task, for the drawer and the task page. */
export const toTaskDto = (
  task: StoredTask,
  lookups: TaskLookups,
  relations: TaskRelations,
): Task => ({
  ...commonFields(task, lookups),
  description: task.description ?? '',
  reporter: personOf(lookups, task.createdBy),
  milestone: milestoneOf(lookups, task.projectId, task.milestoneId),
  checklist: (task.checklist ?? []).map((item) => toChecklistItem(lookups, item)),
  attachments: (task.attachments ?? []).map((file) => toAttachment(lookups, file)),
  dependencyIds: (task.dependencyIds ?? []).map((id) => id.toString()),
  parent: relations.parent,
  dependencies: relations.dependencies,
  subtasks: relations.subtasks,
  updatedBy: personOf(lookups, task.updatedBy),
});
