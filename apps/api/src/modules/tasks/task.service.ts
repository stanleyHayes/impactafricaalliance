import {
  boardOrderBetween,
  formatTaskKey,
  type AuditAction,
  type AuditChange,
  type AuditEvent,
  type Paginated,
  type Task,
  type TaskInput,
  type TaskMove,
  type TaskStatus,
  type TaskUpdate,
  type WorkPriority,
} from '@iaa/shared';
import { Types, type UpdateQuery } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { nextSequence } from '../../common/counter.model.js';
import { NotFoundError, ValidationError } from '../../common/errors.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';
import { diffFields } from '../audit/audit-diff.js';
import { AuditService } from '../audit/audit.service.js';
import { PeopleService } from '../people/people.service.js';
import { ProjectModel } from '../projects/project.model.js';

import {
  projectIdsToName,
  readableTaskChanges,
  taskIdsToName,
  type AuditNames,
  type AuditProjectNames,
} from './task-audit.js';
import { TaskCommentModel } from './task-comment.model.js';
import { announceTaskEvents, type TaskEvent, type TaskEventPublisher } from './task-events.js';
import { idOf, type StoredTask } from './task-presenter.js';
import { TaskQueryService } from './task-query.service.js';
import {
  completedAtAfter,
  describeFieldChanges,
  dueBeforeStart,
  listInWords,
  TASK_STATUS_LABELS,
  toStoredCalendarDate,
  uniqueIds,
  uniqueLabels,
  wouldCreateParentLoop,
  type TaskActor,
} from './task-rules.js';
import { TaskModel } from './task.model.js';

/** The counter behind task numbers (`nextSequence`). */
export const TASK_SEQUENCE = 'task';

/** Fields whose before and after values the activity log shows. */
const AUDITED_FIELDS = [
  'title',
  'priority',
  'projectId',
  'milestoneId',
  'startDate',
  'dueDate',
  'estimateHours',
  'labels',
  'parentTaskId',
  'dependencyIds',
] as const;

/** A 400 that points at one field, in the shape `parseWith` uses. */
const invalid = (path: string, message: string): ValidationError =>
  new ValidationError(message, [{ path, message }]);

const oid = (id: string): Types.ObjectId => new Types.ObjectId(id);

/** A project as an audit entry names it: its title and its milestones' titles. */
interface AuditProjectRow {
  _id: Types.ObjectId;
  title: string;
  milestones?: { id: string; title: string }[];
}

/** What a PATCH will set, in stored form. Absent means unchanged; null means cleared. */
interface TaskChanges {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: WorkPriority;
  assigneeIds?: Types.ObjectId[];
  projectId?: Types.ObjectId | null;
  milestoneId?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimateHours?: number | null;
  labels?: string[];
  parentTaskId?: Types.ObjectId | null;
  dependencyIds?: Types.ObjectId[];
  completedAt?: Date | null;
  boardOrder?: number;
  archivedAt?: Date | null;
}

/** Plain field copies: anything the request sets, as sent. */
const scalarChanges = (input: TaskUpdate): TaskChanges => {
  const changes: TaskChanges = {};
  if (input.title !== undefined) changes.title = input.title;
  if (input.description !== undefined) changes.description = input.description;
  if (input.priority !== undefined) changes.priority = input.priority;
  if (input.labels !== undefined) changes.labels = uniqueLabels(input.labels);
  if (input.estimateHours !== undefined) changes.estimateHours = input.estimateHours;
  if (input.startDate !== undefined) changes.startDate = toStoredCalendarDate(input.startDate);
  if (input.dueDate !== undefined) changes.dueDate = toStoredCalendarDate(input.dueDate);
  return changes;
};

/** References to people and other tasks, as ObjectIds. */
const referenceChanges = (input: TaskUpdate): TaskChanges => {
  const changes: TaskChanges = {};
  if (input.assigneeIds !== undefined) changes.assigneeIds = uniqueIds(input.assigneeIds).map(oid);
  if (input.dependencyIds !== undefined) {
    changes.dependencyIds = uniqueIds(input.dependencyIds).map(oid);
  }
  if (input.parentTaskId !== undefined) {
    changes.parentTaskId = input.parentTaskId ? oid(input.parentTaskId) : null;
  }
  return changes;
};

/**
 * The project and milestone after a PATCH.
 *
 * A milestone belongs to one project, so moving a task to another project, or
 * out of any project, drops the milestone it had unless the request names a
 * new one. A milestone named without a project is left for the check to
 * refuse.
 */
const projectChanges = (before: StoredTask, input: TaskUpdate): TaskChanges => {
  const changes: TaskChanges = {};
  if (input.milestoneId !== undefined) {
    changes.milestoneId = input.milestoneId;
  }
  if (input.projectId !== undefined) {
    changes.projectId = input.projectId ? oid(input.projectId) : null;
    const moved = idOf(before.projectId) !== (input.projectId?.toLowerCase() ?? null);
    if (moved && input.milestoneId === undefined) {
      changes.milestoneId = null;
    }
  }
  return changes;
};

/**
 * The stored fields of a new task that come straight from the request. Empty
 * optional values are left out rather than stored as null, and checklist
 * lines created already ticked are stamped with who and when.
 */
const newTaskFields = (
  input: TaskInput,
  dates: { startDate: Date | null; dueDate: Date | null },
  actor: TaskActor,
  now: Date,
) => ({
  title: input.title,
  description: input.description,
  status: input.status,
  priority: input.priority,
  projectId: input.projectId ?? undefined,
  milestoneId: input.milestoneId ?? undefined,
  startDate: dates.startDate ?? undefined,
  dueDate: dates.dueDate ?? undefined,
  estimateHours: input.estimateHours ?? undefined,
  labels: uniqueLabels(input.labels),
  checklist: input.checklist.map((item) =>
    item.done ? { ...item, doneAt: now, doneBy: actor.id } : item,
  ),
  parentTaskId: input.parentTaskId ?? undefined,
  commentCount: 0,
  completedAt: input.status === 'done' ? now : undefined,
  createdBy: actor.id,
  updatedBy: actor.id,
});

const hasKey = <K extends keyof TaskChanges>(changes: TaskChanges, key: K): boolean =>
  changes[key] !== undefined;

/** The value a field will hold after the change: the new one, or what was stored. */
const after = <K extends keyof TaskChanges & keyof StoredTask>(
  before: StoredTask,
  changes: TaskChanges,
  key: K,
): TaskChanges[K] | StoredTask[K] => (hasKey(changes, key) ? changes[key] : before[key]);

/** `$set` for values and `$unset` for nulls, so a cleared field is gone rather than null. */
const toUpdate = (changes: TaskChanges, actorId: string): UpdateQuery<StoredTask> => {
  const set: Record<string, unknown> = { updatedBy: actorId };
  const unset: Record<string, ''> = {};
  for (const [field, value] of Object.entries(changes)) {
    if (value === null) {
      unset[field] = '';
    } else if (value !== undefined) {
      set[field] = value;
    }
  }
  return Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set };
};

/**
 * Creating, editing, moving, archiving and deleting tasks (plan §3.3).
 *
 * Every id a request names is checked here: the project exists and is not
 * archived, a milestone belongs to that project, assignees are active
 * colleagues, and a parent or dependency is a real task other than this one
 * (plan D16). Every change is written to the audit trail and announced to the
 * task events boundary (plan D4, D12); neither can fail the write.
 */
@injectable()
export class TaskService {
  // eslint-disable-next-line max-params
  constructor(
    @inject(TaskQueryService) private readonly reader: TaskQueryService,
    @inject(PeopleService) private readonly people: PeopleService,
    @inject(AuditService) private readonly audit: AuditService,
    @inject(TOKENS.TaskEvents) private readonly events: TaskEventPublisher,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /**
   * A new task, numbered from the `task` counter and placed at the bottom of
   * its board column. The reporter is whoever created it.
   */
  async create(input: TaskInput, actor: TaskActor): Promise<Task> {
    const startDate = toStoredCalendarDate(input.startDate) ?? null;
    const dueDate = toStoredCalendarDate(input.dueDate) ?? null;
    if (dueBeforeStart(startDate, dueDate)) {
      throw invalid('dueDate', 'The due date cannot be before the start date');
    }
    const assigneeIds = uniqueIds(input.assigneeIds);
    const dependencyIds = uniqueIds(input.dependencyIds);
    await this.checkProject(input.projectId ?? null, input.milestoneId ?? null, null);
    await this.assertAssignees(assigneeIds);
    await this.checkParent(null, input.parentTaskId ?? null);
    await this.checkDependencies(null, dependencyIds);

    const number = await nextSequence(TASK_SEQUENCE);
    const created = await TaskModel.create({
      ...newTaskFields(input, { startDate, dueDate }, actor, new Date()),
      key: formatTaskKey(number),
      number,
      assigneeIds,
      dependencyIds,
      boardOrder: await this.endOfColumn(input.status),
    });
    const task = await this.reader.findStored(created._id.toString());

    await this.record(task, actor, {
      action: 'created',
      summary: `Created ${task.key}: ${task.title}`,
    });
    if (assigneeIds.length > 0) {
      await this.recordAssignment(task, actor, assigneeIds, 'assigned');
    }
    this.announce(
      assigneeIds.length > 0
        ? [{ ...this.eventBase(task, actor), type: 'task.assigned', assigneeIds }]
        : [],
    );
    return this.reader.present(task);
  }

  /**
   * Edit a task. Only what the request names changes (plan D6's explicit
   * null clears a field).
   *
   * - Entering `done` stamps `completedAt`; leaving it clears the stamp.
   * - A status change puts the card at the top of its new column, where the
   *   person who moved it will look, and where a column capped at 100 cards
   *   still shows it.
   * - A milestone must belong to the task's project after the change.
   * - Only newly added assignees are checked as active, so someone who has
   *   left does not block every other edit until they are taken off.
   * - A task cannot be its own parent, a subtask of its own subtask, or its
   *   own dependency.
   */
  async update(id: string, input: TaskUpdate, actor: TaskActor): Promise<Task> {
    const before = await this.reader.findStored(id);
    const changes: TaskChanges = {
      ...scalarChanges(input),
      ...referenceChanges(input),
      ...projectChanges(before, input),
    };
    await this.applyStatus(before, input.status, changes);
    await this.checkChanges(before, input, changes);

    const edits = this.fieldEdits(before, changes);
    const statusChanged = changes.status !== undefined;
    const added = this.addedAssignees(before, changes);
    const removed = this.removedAssignees(before, changes);
    if (!statusChanged && edits.length === 0 && added.length === 0 && removed.length === 0) {
      return this.reader.present(before);
    }

    const updated = await TaskModel.findOneAndUpdate(
      { _id: before._id },
      toUpdate(changes, actor.id),
      { returnDocument: 'after' },
    )
      .lean<StoredTask>()
      .exec();
    if (!updated) {
      throw new NotFoundError('Task');
    }

    if (statusChanged) {
      await this.recordStatus(before, updated, actor, 'Moved');
    }
    if (added.length > 0) await this.recordAssignment(updated, actor, added, 'assigned');
    if (removed.length > 0) await this.recordAssignment(updated, actor, removed, 'unassigned');
    if (edits.length > 0) {
      await this.record(updated, actor, {
        action: 'updated',
        summary: describeFieldChanges(edits.map((edit) => edit.field)),
        changes: await this.readableEdits(edits, before, updated),
      });
    }
    this.announce(this.updateEvents(before, updated, actor, { added, removed }));
    return this.reader.present(updated);
  }

  /**
   * A board move: the card's new column and position, sent whole so a retry
   * of the same move changes nothing. `completedAt` follows the status as it
   * does on any edit. Reordering within a column is not logged: the activity
   * log is for what happened to the work, not where its card sits.
   */
  async move(id: string, input: TaskMove, actor: TaskActor): Promise<Task> {
    const before = await this.reader.findStored(id);
    const statusChanged = input.status !== before.status;
    if (!statusChanged && before.boardOrder === input.boardOrder) {
      return this.reader.present(before);
    }
    const completedAt = completedAtAfter(before, input.status, new Date());
    const updated = await TaskModel.findOneAndUpdate(
      { _id: before._id },
      toUpdate({ status: input.status, boardOrder: input.boardOrder, completedAt }, actor.id),
      { returnDocument: 'after' },
    )
      .lean<StoredTask>()
      .exec();
    if (!updated) {
      throw new NotFoundError('Task');
    }
    if (statusChanged) {
      await this.recordStatus(before, updated, actor, 'Moved on the board');
      this.announce([
        {
          ...this.eventBase(updated, actor),
          type: 'task.status-changed',
          from: before.status,
          to: updated.status,
        },
      ]);
    }
    return this.reader.present(updated);
  }

  /**
   * Archive or restore a task. Archived tasks leave every list and the board
   * but keep their comments, history and links, so restoring brings the task
   * back exactly as it was (plan D5). Repeating either is harmless.
   */
  async archive(id: string, archived: boolean, actor: TaskActor): Promise<Task> {
    const before = await this.reader.findStored(id);
    if (Boolean(before.archivedAt) === archived) {
      return this.reader.present(before);
    }
    const updated = await TaskModel.findOneAndUpdate(
      { _id: before._id },
      toUpdate({ archivedAt: archived ? new Date() : null }, actor.id),
      { returnDocument: 'after' },
    )
      .lean<StoredTask>()
      .exec();
    if (!updated) {
      throw new NotFoundError('Task');
    }
    await this.record(updated, actor, {
      action: archived ? 'archived' : 'restored',
      summary: archived ? 'Archived the task' : 'Restored the task',
    });
    return this.reader.present(updated);
  }

  /**
   * Delete a task for good, with its comments (plan D5: tasks are internal
   * working records). Subtasks lose their parent and other tasks lose the
   * dependency, rather than pointing at nothing.
   *
   * The task goes first: if removing its comments then failed, they would be
   * unreachable leftovers, which is better than a task that has silently lost
   * its discussion.
   */
  async remove(id: string, actor: TaskActor): Promise<void> {
    const task = await this.reader.findStored(id);
    await TaskModel.deleteOne({ _id: task._id }).exec();
    await Promise.all([
      TaskCommentModel.deleteMany({ taskId: task._id }).exec(),
      TaskModel.updateMany({ parentTaskId: task._id }, { $unset: { parentTaskId: '' } }).exec(),
      TaskModel.updateMany(
        { dependencyIds: task._id },
        { $pull: { dependencyIds: task._id } },
      ).exec(),
    ]);
    await this.record(task, actor, {
      action: 'deleted',
      summary: `Deleted ${task.key}: ${task.title}`,
    });
  }

  /** A task's activity log, newest first. 404 for a task that does not exist. */
  async activity(id: string, page: number, pageSize: number): Promise<Paginated<AuditEvent>> {
    const task = await this.reader.findStored(id);
    return this.audit.list('task', task._id.toString(), page, pageSize);
  }

  /**
   * Assignees must be active colleagues (plan D16). The people directory
   * refuses with the offending ids; the refusal is re-worded here to name the
   * field as well, so the task form can take the reader back to the step that
   * holds it, and still lists the ids so the picker can mark who is wrong.
   */
  private async assertAssignees(ids: readonly string[]): Promise<void> {
    try {
      await this.people.assertActive(ids, 'Assignees');
    } catch (err) {
      if (!(err instanceof ValidationError)) {
        throw err;
      }
      const message = 'Choose assignees who are active members of the team';
      const missing = Array.isArray(err.details) ? err.details.map(String) : [];
      throw new ValidationError(message, [{ path: 'assigneeIds', message, ids: missing }]);
    }
  }

  /**
   * The audit changes of an edit with names in place of ids and days in place
   * of instants (see `readableTaskChanges`). A failed lookup falls back to the
   * raw values: the log entry matters more than its polish.
   */
  private async readableEdits(
    edits: AuditChange[],
    before: StoredTask,
    updated: StoredTask,
  ): Promise<AuditChange[]> {
    try {
      const names = await this.auditNames(edits, before, updated);
      return readableTaskChanges(edits, before, updated, names);
    } catch (err) {
      this.logger.error(
        { err, module: 'tasks', entityId: before._id.toString() },
        'Failed to name the changes in a task audit entry',
      );
      return edits;
    }
  }

  /** The projects and tasks an edit's audit entry names, looked up once and only when needed. */
  private async auditNames(
    edits: AuditChange[],
    before: StoredTask,
    updated: StoredTask,
  ): Promise<AuditNames> {
    const projectIds = projectIdsToName(edits, before, updated);
    const taskIds = taskIdsToName(edits, before, updated);
    const [projects, tasks] = await Promise.all([
      projectIds.length > 0
        ? ProjectModel.find(
            { _id: { $in: projectIds } },
            { title: 1, 'milestones.id': 1, 'milestones.title': 1 },
          )
            .lean<AuditProjectRow[]>()
            .exec()
        : [],
      taskIds.length > 0
        ? TaskModel.find({ _id: { $in: taskIds } }, { key: 1 })
            .lean<{ _id: Types.ObjectId; key: string }[]>()
            .exec()
        : [],
    ]);
    const byId = new Map<string, AuditProjectNames>(
      projects.map((project) => [
        project._id.toString(),
        {
          title: project.title,
          milestones: new Map((project.milestones ?? []).map((item) => [item.id, item.title])),
        },
      ]),
    );
    return {
      project: {
        from: byId.get(idOf(before.projectId) ?? '') ?? null,
        to: byId.get(idOf(updated.projectId) ?? '') ?? null,
      },
      tasks: new Map(tasks.map((task) => [task._id.toString(), task.key])),
    };
  }

  private async applyStatus(
    before: StoredTask,
    status: TaskStatus | undefined,
    changes: TaskChanges,
  ): Promise<void> {
    if (status === undefined || status === before.status) {
      return;
    }
    changes.status = status;
    changes.completedAt = completedAtAfter(before, status, new Date());
    changes.boardOrder = await this.topOfColumn(status, before._id);
  }

  /** Every reference and date rule for a PATCH, against the values after it. */
  private async checkChanges(
    before: StoredTask,
    input: TaskUpdate,
    changes: TaskChanges,
  ): Promise<void> {
    const startDate = after(before, changes, 'startDate');
    const dueDate = after(before, changes, 'dueDate');
    if (dueBeforeStart(startDate, dueDate)) {
      throw invalid('dueDate', 'The due date cannot be before the start date');
    }
    if (input.projectId !== undefined || input.milestoneId !== undefined) {
      await this.checkProject(
        idOf(after(before, changes, 'projectId')),
        after(before, changes, 'milestoneId') ?? null,
        idOf(before.projectId),
      );
    }
    const taskId = before._id.toString();
    await this.assertAssignees(this.addedAssignees(before, changes));
    if (input.parentTaskId !== undefined) {
      await this.checkParent(taskId, input.parentTaskId);
    }
    if (input.dependencyIds !== undefined) {
      await this.checkDependencies(taskId, uniqueIds(input.dependencyIds));
    }
  }

  /**
   * The project must exist and not be archived, and a milestone must be one
   * of its own. `keepProjectId` is the task's current project, which may stay
   * even after being archived: archiving a project must not freeze every edit
   * to its tasks.
   */
  private async checkProject(
    projectId: string | null,
    milestoneId: string | null,
    keepProjectId: string | null,
  ): Promise<void> {
    if (!projectId) {
      if (milestoneId) {
        throw invalid('milestoneId', 'Choose a project before choosing one of its milestones');
      }
      return;
    }
    const project = await ProjectModel.findById(projectId, {
      status: 1,
      archivedAt: 1,
      'milestones.id': 1,
    })
      .lean<{ status: string; archivedAt?: Date | null; milestones?: { id: string }[] }>()
      .exec();
    const archived = Boolean(project && (project.status === 'archived' || project.archivedAt));
    if (!project || (archived && projectId.toLowerCase() !== keepProjectId)) {
      throw invalid('projectId', 'Choose a project that exists and is not archived');
    }
    if (milestoneId && !(project.milestones ?? []).some((item) => item.id === milestoneId)) {
      throw invalid('milestoneId', "Choose a milestone from the task's project");
    }
  }

  private async checkParent(taskId: string | null, parentId: string | null): Promise<void> {
    if (!parentId) {
      return;
    }
    const parent = parentId.toLowerCase();
    if (parent === taskId) {
      throw invalid('parentTaskId', 'A task cannot be its own parent');
    }
    if (!(await TaskModel.exists({ _id: parent }).exec())) {
      throw invalid('parentTaskId', 'Choose a parent task that exists');
    }
    if (taskId && (await wouldCreateParentLoop(taskId, parent, (id) => this.parentOf(id)))) {
      throw invalid('parentTaskId', 'That would make this task a subtask of its own subtask');
    }
  }

  private async parentOf(id: string): Promise<string | null> {
    const task = await TaskModel.findById(id, { parentTaskId: 1 })
      .lean<{ parentTaskId?: Types.ObjectId | null }>()
      .exec();
    return idOf(task?.parentTaskId);
  }

  private async checkDependencies(taskId: string | null, ids: readonly string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    if (taskId && ids.includes(taskId)) {
      throw invalid('dependencyIds', 'A task cannot depend on itself');
    }
    const found = await TaskModel.countDocuments({ _id: { $in: ids } }).exec();
    if (found !== ids.length) {
      throw invalid('dependencyIds', 'Choose dependencies from tasks that exist');
    }
  }

  /** Below the last card in a column: where new work joins the queue. */
  private async endOfColumn(status: TaskStatus): Promise<number> {
    const last = await TaskModel.findOne({ status }, { boardOrder: 1 })
      .sort({ boardOrder: -1 })
      .lean<{ boardOrder: number }>()
      .exec();
    return boardOrderBetween(last?.boardOrder ?? null, null);
  }

  /** Above the first card in a column, not counting the card being moved. */
  private async topOfColumn(status: TaskStatus, exclude: Types.ObjectId): Promise<number> {
    const first = await TaskModel.findOne({ status, _id: { $ne: exclude } }, { boardOrder: 1 })
      .sort({ boardOrder: 1 })
      .lean<{ boardOrder: number }>()
      .exec();
    return boardOrderBetween(null, first?.boardOrder ?? null);
  }

  /** The audited edits, plus the description, whose text is too long to be worth copying. */
  private fieldEdits(before: StoredTask, changes: TaskChanges): AuditChange[] {
    const edits = diffFields(before, changes, AUDITED_FIELDS);
    if (changes.description !== undefined && changes.description !== (before.description ?? '')) {
      edits.push({ field: 'description' });
    }
    return edits;
  }

  private addedAssignees(before: StoredTask, changes: TaskChanges): string[] {
    const current = new Set((before.assigneeIds ?? []).map(String));
    return (changes.assigneeIds ?? []).map(String).filter((id) => !current.has(id));
  }

  private removedAssignees(before: StoredTask, changes: TaskChanges): string[] {
    if (!changes.assigneeIds) {
      return [];
    }
    const next = new Set(changes.assigneeIds.map(String));
    return (before.assigneeIds ?? []).map(String).filter((id) => !next.has(id));
  }

  private updateEvents(
    before: StoredTask,
    updated: StoredTask,
    actor: TaskActor,
    people: { added: string[]; removed: string[] },
  ): TaskEvent[] {
    const base = this.eventBase(updated, actor);
    const events: TaskEvent[] = [];
    if (people.added.length > 0) {
      events.push({ ...base, type: 'task.assigned', assigneeIds: people.added });
    }
    if (people.removed.length > 0) {
      events.push({ ...base, type: 'task.unassigned', assigneeIds: people.removed });
    }
    if (before.status !== updated.status) {
      events.push({
        ...base,
        type: 'task.status-changed',
        from: before.status,
        to: updated.status,
      });
    }
    const from = before.dueDate?.toISOString() ?? null;
    const to = updated.dueDate?.toISOString() ?? null;
    if (from !== to) {
      events.push({ ...base, type: 'task.due-changed', from, to });
    }
    return events;
  }

  private eventBase(task: StoredTask, actor: TaskActor) {
    return {
      taskId: task._id.toString(),
      taskKey: task.key,
      actorId: actor.id,
      at: new Date().toISOString(),
    };
  }

  private announce(events: TaskEvent[]): void {
    announceTaskEvents(this.events, this.logger, events);
  }

  private async recordStatus(
    before: StoredTask,
    updated: StoredTask,
    actor: TaskActor,
    verb: string,
  ): Promise<void> {
    await this.record(updated, actor, {
      action: 'status-changed',
      summary: `${verb} from ${TASK_STATUS_LABELS[before.status]} to ${TASK_STATUS_LABELS[updated.status]}`,
      changes: [
        {
          field: 'status',
          from: TASK_STATUS_LABELS[before.status],
          to: TASK_STATUS_LABELS[updated.status],
        },
      ],
    });
  }

  private async recordAssignment(
    task: StoredTask,
    actor: TaskActor,
    ids: readonly string[],
    action: 'assigned' | 'unassigned',
  ): Promise<void> {
    const people = await this.people.summaries(ids);
    const names = ids.map((id) => people.get(id)?.name ?? 'a former colleague');
    await this.record(task, actor, {
      action,
      summary: `${action === 'assigned' ? 'Assigned' : 'Unassigned'} ${listInWords(names)}`,
    });
  }

  private async record(
    task: StoredTask,
    actor: TaskActor,
    entry: { action: AuditAction; summary: string; changes?: AuditChange[] },
  ): Promise<void> {
    await this.audit.record({
      module: 'tasks',
      entityType: 'task',
      entityId: task._id,
      actorId: actor.id,
      actorEmail: actor.email,
      ...entry,
    });
  }
}
