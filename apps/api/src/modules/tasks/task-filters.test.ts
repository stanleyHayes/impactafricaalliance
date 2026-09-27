import { dueBucket, taskBoardQuerySchema, taskListQuerySchema } from '@iaa/shared';
import { Types, type PipelineStage } from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
  BOARD_SORT,
  buildTaskFilter,
  dayBounds,
  dueConditions,
  listItemPipeline,
  summaryFilters,
  taskSortSpec,
} from './task-filters.js';

const me = '64b7f0c2a1b2c3d4e5f60718';
const today = '2026-10-05';

type Condition = Record<string, unknown>;

/** The conditions a filter joins with `$and`, or none. */
const conditionsOf = (filter: Condition): Condition[] => (filter.$and as Condition[]) ?? [];

/** Whether a stored due date meets one bucket's range, read as MongoDB would. */
const matches = (conditions: Condition[], dueDate: Date | null, status = 'todo'): boolean =>
  conditions.every((condition) => {
    if ('status' in condition) {
      return (condition.status as { $ne: string }).$ne !== status;
    }
    const range = condition.dueDate as { $lt?: Date; $gte?: Date } | null;
    if (range === null) {
      return dueDate === null;
    }
    if (dueDate === null) {
      return false;
    }
    return (
      (range.$gte === undefined || dueDate >= range.$gte) &&
      (range.$lt === undefined || dueDate < range.$lt)
    );
  });

describe('due buckets', () => {
  it('spans whole UTC days', () => {
    expect(dayBounds(today)).toEqual({
      start: new Date('2026-10-05T00:00:00.000Z'),
      end: new Date('2026-10-06T00:00:00.000Z'),
    });
  });

  it('puts each stored due date in the same bucket as the shared dueBucket', () => {
    const dates = ['2026-09-30', '2026-10-04', '2026-10-05', '2026-10-06', '2027-01-01'];
    for (const date of dates) {
      const stored = new Date(`${date}T12:00:00.000Z`);
      const expected = dueBucket(stored.toISOString(), today);
      for (const bucket of ['overdue', 'today', 'upcoming', 'none'] as const) {
        expect(matches(dueConditions(bucket, today), stored), `${date} in ${bucket}`).toBe(
          bucket === expected,
        );
      }
    }
    expect(matches(dueConditions('none', today), null)).toBe(true);
    expect(matches(dueConditions('overdue', today), null)).toBe(false);
  });

  it('never counts finished work as overdue', () => {
    const lastWeek = new Date('2026-09-28T12:00:00.000Z');
    expect(matches(dueConditions('overdue', today), lastWeek, 'todo')).toBe(true);
    expect(matches(dueConditions('overdue', today), lastWeek, 'done')).toBe(false);
  });
});

describe('buildTaskFilter', () => {
  const list = (query: Record<string, string>) =>
    buildTaskFilter(taskListQuerySchema.parse(query), me, 'hide-unless-included');
  const board = (query: Record<string, string>) =>
    buildTaskFilter(taskBoardQuerySchema.parse(query), me, 'show-unless-excluded');

  it('hides archived tasks, and done ones on the list, by default', () => {
    expect(conditionsOf(list({}))).toEqual([{ archivedAt: null }, { status: { $ne: 'done' } }]);
    expect(conditionsOf(list({ includeDone: 'true', includeArchived: 'true' }))).toEqual([]);
  });

  it('shows done tasks on the board unless told not to', () => {
    expect(conditionsOf(board({}))).toEqual([{ archivedAt: null }]);
    expect(conditionsOf(board({ includeDone: 'false' }))).toContainEqual({
      status: { $ne: 'done' },
    });
  });

  it('lets a status filter decide, done included', () => {
    expect(conditionsOf(list({ status: 'done,review' }))).toContainEqual({
      status: { $in: ['done', 'review'] },
    });
    // An emptied list is no filter at all.
    expect(conditionsOf(list({ status: '' }))).toContainEqual({ status: { $ne: 'done' } });
  });

  it('resolves me to the caller and none to unassigned', () => {
    expect(conditionsOf(list({ assigneeId: 'me' }))).toContainEqual({
      assigneeIds: new Types.ObjectId(me),
    });
    expect(conditionsOf(list({ assigneeId: 'none' }))).toContainEqual({
      assigneeIds: { $size: 0 },
    });
    expect(conditionsOf(list({ projectId: 'none' }))).toContainEqual({ projectId: null });
  });

  it('gives a caller with no account behind their token nothing of their own', () => {
    const filter = buildTaskFilter(
      taskListQuerySchema.parse({ assigneeId: 'me' }),
      'x',
      'hide-unless-included',
    );
    expect(conditionsOf(filter)).toContainEqual({ _id: null });
  });

  it('matches labels whole and in any case, with the text taken literally', () => {
    const label = conditionsOf(list({ label: 'a.b' })).find((condition) => 'labels' in condition);
    const pattern = label?.labels as RegExp;
    expect(pattern.test('A.B')).toBe(true);
    expect(pattern.test('axb')).toBe(false);
    expect(pattern.test('a.b.c')).toBe(false);
  });
});

describe('summaryFilters', () => {
  it('counts only the caller’s open, unarchived work', () => {
    const filters = summaryFilters(me, today);
    expect(filters.open).toEqual({
      assigneeIds: new Types.ObjectId(me),
      archivedAt: null,
      status: { $ne: 'done' },
    });
    expect(filters.dueToday.dueDate).toEqual({
      $gte: new Date('2026-10-05T00:00:00.000Z'),
      $lt: new Date('2026-10-06T00:00:00.000Z'),
    });
  });
});

describe('taskSortSpec', () => {
  it('keeps undated work last and ends on a unique key', () => {
    expect(taskSortSpec('due', 'desc')).toEqual({ _dueMissing: 1, dueDate: -1, number: -1 });
    expect(Object.keys(taskSortSpec('updated', 'asc')).at(-1)).toBe('_id');
    expect(taskSortSpec('priority', 'desc')._priorityRank).toBe(-1);
  });
});

describe('listItemPipeline', () => {
  const match = { archivedAt: null };
  const stageNames = (stages: PipelineStage[]): string[] =>
    stages.map((stage) => Object.keys(stage)[0] ?? '');

  it.each([
    ['the board', BOARD_SORT],
    ['the default list', taskSortSpec('updated', 'desc')],
    ['created', taskSortSpec('created', 'asc')],
    ['key', taskSortSpec('key', 'desc')],
  ])('sorts %s straight after the match, so an index can serve the page', (_name, sort) => {
    const stages = listItemPipeline(match, sort, 0, 100);
    expect(stageNames(stages)).toEqual(['$match', '$sort', '$skip', '$limit', '$project']);
    expect(stages[1]).toEqual({ $sort: sort });
  });

  it.each([
    ['due', taskSortSpec('due', 'asc')],
    ['priority', taskSortSpec('priority', 'desc')],
  ])('cuts tasks to their row before a %s sort, and drops the worked-out keys', (_name, sort) => {
    const stages = listItemPipeline(match, sort, 20, 20);
    expect(stageNames(stages)).toEqual([
      '$match',
      '$project',
      '$sort',
      '$skip',
      '$limit',
      '$project',
    ]);
    const slim = (stages[1] as { $project: Record<string, unknown> }).$project;
    // The row's own fields and counts, plus the keys the sort needs.
    expect(slim).toMatchObject({ title: 1, checklistTotal: expect.anything() });
    expect(slim).toHaveProperty('_priorityRank');
    expect(slim).toHaveProperty('_dueMissing');
    expect(slim).not.toHaveProperty('description');
    expect(stages.at(-1)).toEqual({ $project: { _priorityRank: 0, _dueMissing: 0 } });
  });
});
