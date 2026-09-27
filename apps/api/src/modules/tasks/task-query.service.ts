import {
  parseTaskKey,
  TASK_BOARD_COLUMN_LIMIT,
  TASK_BOARD_COLUMNS,
  todayKey,
  type Paginated,
  type Task,
  type TaskBoard,
  type TaskBoardQuery,
  type TaskListItem,
  type TaskListQuery,
  type TaskRef,
  type TaskStatus,
  type TaskSummary,
  type TaskSummaryQuery,
} from '@iaa/shared';
import { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { NotFoundError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import { PeopleService } from '../people/people.service.js';
import { ProjectModel, type ProjectMilestoneRecord } from '../projects/project.model.js';

import {
  BOARD_SORT,
  buildTaskFilter,
  listItemPipeline,
  summaryFilters,
  taskSortSpec,
} from './task-filters.js';
import {
  idOf,
  peopleIdsOf,
  toTaskDto,
  toTaskListItem,
  toTaskRef,
  type ProjectLookup,
  type StoredTask,
  type StoredTaskRow,
  type TaskLookups,
  type TaskRelations,
} from './task-presenter.js';
import { TaskModel } from './task.model.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Most subtasks the detail view lists. A task with more is a project. */
const SUBTASK_LIMIT = 100;

const REF_PROJECTION = { key: 1, title: 1, status: 1 } as const;

type StoredRef = Pick<StoredTask, '_id' | 'key' | 'title' | 'status'>;

interface StoredProjectLookup {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  milestones?: ProjectMilestoneRecord[];
}

/**
 * How `GET /tasks/:idOrKey` finds a task: by id, or by key in any case
 * (`iaa-42` finds `IAA-42`). Null when the text is neither, which the caller
 * reports as not found: a link with a typo names no task.
 */
export const taskLookupFilter = (idOrKey: string): Record<string, unknown> | null => {
  const value = idOrKey.trim();
  if (OBJECT_ID.test(value)) {
    return { _id: new Types.ObjectId(value) };
  }
  const number = parseTaskKey(value);
  return number === null ? null : { number };
};

/**
 * Reading tasks: the list, the board, the caller's summary and one task in
 * full, each turned into the DTOs in `@iaa/shared`.
 *
 * Every read resolves the people and projects a page names in one lookup
 * each, rather than one per row.
 */
@injectable()
export class TaskQueryService {
  constructor(@inject(PeopleService) private readonly people: PeopleService) {}

  /**
   * A page of the task list. Done tasks are hidden unless `includeDone=true`
   * or the `status` filter asks for them; archived tasks unless
   * `includeArchived=true` (see `buildTaskFilter`).
   */
  async list(query: TaskListQuery, actorId: string): Promise<Paginated<TaskListItem>> {
    const match = buildTaskFilter(query, actorId, 'hide-unless-included');
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      TaskModel.aggregate<StoredTaskRow>(
        listItemPipeline(match, taskSortSpec(query.sort, query.order), skip, query.pageSize),
      ).exec(),
      TaskModel.countDocuments(match).exec(),
    ]);
    const lookups = await this.lookupsFor(rows);
    return paginate(
      rows.map((row) => toTaskListItem(row, lookups)),
      total,
      query.page,
      query.pageSize,
    );
  }

  /**
   * The board: one column per status in `TASK_BOARD_COLUMNS` order, each with
   * its first `TASK_BOARD_COLUMN_LIMIT` cards by position and its full total,
   * so a long column can say how many it is not showing. Done cards are shown
   * unless `includeDone=false`.
   */
  async board(query: TaskBoardQuery, actorId: string): Promise<TaskBoard> {
    const match = buildTaskFilter(query, actorId, 'show-unless-excluded');
    const [totals, columns] = await Promise.all([
      TaskModel.aggregate<{ _id: TaskStatus; total: number }>([
        { $match: match },
        { $group: { _id: '$status', total: { $sum: 1 } } },
      ]).exec(),
      Promise.all(
        TASK_BOARD_COLUMNS.map((status) =>
          TaskModel.aggregate<StoredTaskRow>(
            listItemPipeline({ $and: [match, { status }] }, BOARD_SORT, 0, TASK_BOARD_COLUMN_LIMIT),
          ).exec(),
        ),
      ),
    ]);
    const lookups = await this.lookupsFor(columns.flat());
    const totalByStatus = new Map(totals.map((row) => [row._id, row.total]));
    return {
      columns: TASK_BOARD_COLUMNS.map((status, index) => ({
        status,
        total: totalByStatus.get(status) ?? 0,
        items: (columns[index] ?? []).map((row) => toTaskListItem(row, lookups)),
      })),
    };
  }

  /**
   * The caller's own open work, for the sidebar badge: overdue, due today,
   * upcoming, and everything open. Compared with the caller's `today`.
   */
  async summary(query: TaskSummaryQuery, actorId: string): Promise<TaskSummary> {
    const filters = summaryFilters(actorId, query.today ?? todayKey());
    const [overdue, dueToday, upcoming, open] = await Promise.all([
      TaskModel.countDocuments(filters.overdue).exec(),
      TaskModel.countDocuments(filters.dueToday).exec(),
      TaskModel.countDocuments(filters.upcoming).exec(),
      TaskModel.countDocuments(filters.open).exec(),
    ]);
    return { overdue, dueToday, upcoming, open };
  }

  /** One task in full, by id or key. Archived tasks are found too: a link to one must still open. */
  async get(idOrKey: string): Promise<Task> {
    return this.present(await this.findStored(idOrKey));
  }

  /** The stored task behind an id or key, or a 404. */
  async findStored(idOrKey: string): Promise<StoredTask> {
    const filter = taskLookupFilter(idOrKey);
    const task = filter ? await TaskModel.findOne(filter).lean<StoredTask>().exec() : null;
    if (!task) {
      throw new NotFoundError('Task');
    }
    return task;
  }

  /** A stored task as the detail page and the drawer see it. */
  async present(task: StoredTask): Promise<Task> {
    const [lookups, relations] = await Promise.all([
      this.lookupsFor([task]),
      this.relationsOf(task),
    ]);
    return toTaskDto(task, lookups, relations);
  }

  /** Everyone and every project a set of tasks names, looked up once. */
  async lookupsFor(tasks: readonly Partial<StoredTask>[]): Promise<TaskLookups> {
    const projectIds = [...new Set(tasks.flatMap((task) => idOf(task.projectId) ?? []))];
    const [people, projects] = await Promise.all([
      this.people.summaries(peopleIdsOf(tasks)),
      this.projectsById(projectIds),
    ]);
    return { people, projects };
  }

  private async projectsById(ids: string[]): Promise<Map<string, ProjectLookup>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await ProjectModel.find(
      { _id: { $in: ids } },
      { title: 1, slug: 1, 'milestones.id': 1, 'milestones.title': 1 },
    )
      .lean<StoredProjectLookup[]>()
      .exec();
    return new Map(
      rows.map((row) => [
        row._id.toString(),
        {
          id: row._id.toString(),
          title: row.title,
          slug: row.slug,
          milestones: (row.milestones ?? []).map((milestone) => ({
            id: milestone.id,
            title: milestone.title,
          })),
        },
      ]),
    );
  }

  /**
   * The parent, dependencies and subtasks, as references. Dependencies keep
   * the order they were added in; a related task deleted since is left out.
   */
  private async relationsOf(task: StoredTask): Promise<TaskRelations> {
    const dependencyIds = task.dependencyIds ?? [];
    const [parent, dependencies, subtasks] = await Promise.all([
      task.parentTaskId
        ? TaskModel.findById(task.parentTaskId, REF_PROJECTION).lean<StoredRef>().exec()
        : null,
      dependencyIds.length > 0
        ? TaskModel.find({ _id: { $in: dependencyIds } }, REF_PROJECTION)
            .lean<StoredRef[]>()
            .exec()
        : [],
      TaskModel.find({ parentTaskId: task._id, archivedAt: null }, REF_PROJECTION)
        .sort({ number: 1 })
        .limit(SUBTASK_LIMIT)
        .lean<StoredRef[]>()
        .exec(),
    ]);
    const byId = new Map(dependencies.map((ref) => [ref._id.toString(), ref]));
    return {
      parent: parent ? toTaskRef(parent) : null,
      dependencies: dependencyIds.flatMap((id): TaskRef[] => {
        const ref = byId.get(id.toString());
        return ref ? [toTaskRef(ref)] : [];
      }),
      subtasks: subtasks.map(toTaskRef),
    };
  }
}
