import {
  TASK_BOARD_COLUMN_LIMIT,
  taskBoardQuerySchema,
  taskListQuerySchema,
  type TaskStatus,
} from '@iaa/shared';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { type PipelineStage } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BOARD_SORT, buildTaskFilter, listItemPipeline, taskSortSpec } from './task-filters.js';
import { TaskModel } from './task.model.js';

/**
 * The list and board queries against a real MongoDB with the model's own
 * indexes, to prove the first page is read from an index rather than by
 * fetching and sorting every matching task. Done tasks only ever pile up, so
 * a board column that sorted all of them would slow down year on year.
 */

const actorId = new mongoose.Types.ObjectId().toString();
const DONE = TASK_BOARD_COLUMN_LIMIT * 3;
const OPEN_STATUSES: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'blocked', 'review'];
const OPEN = 200;

let mongo: MongoMemoryServer;

/** Every `totalDocsExamined` in an explain, whatever the engine's layout; the largest wins. */
const docsExamined = (explain: unknown): number => {
  const found = [...JSON.stringify(explain).matchAll(/"totalDocsExamined":(\d+)/g)].map((match) =>
    Number(match[1]),
  );
  expect(found.length).toBeGreaterThan(0);
  return Math.max(...found);
};

const explain = async (pipeline: PipelineStage[]): Promise<unknown> =>
  TaskModel.aggregate(pipeline).explain('executionStats');

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT ??= '60000';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { autoIndex: false });
  // What `npm run indexes:sync -- --confirm` builds.
  await TaskModel.createIndexes();
  const now = Date.now();
  const docs = Array.from({ length: DONE + OPEN }, (_, index) => {
    const number = index + 1;
    return {
      key: `IAA-${number}`,
      number,
      title: `Task ${number}`,
      description: 'A long brief. '.repeat(100),
      status: index < DONE ? 'done' : OPEN_STATUSES[index % OPEN_STATUSES.length],
      priority: 'medium',
      assigneeIds: [],
      labels: [],
      checklist: [],
      attachments: [],
      dependencyIds: [],
      // Out of step with the insertion order, so the sort has real work.
      boardOrder: ((number * 7919) % 100_000) * 1024,
      commentCount: 0,
      createdAt: new Date(now - number * 60_000),
      updatedAt: new Date(now - ((number * 104_729) % 1_000_000) * 1000),
    };
  });
  await TaskModel.collection.insertMany(docs);
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

describe('task list and board queries', () => {
  it('reads a board column’s first cards from the index, not every card in it', async () => {
    const match = buildTaskFilter(taskBoardQuerySchema.parse({}), actorId, 'show-unless-excluded');
    const pipeline = listItemPipeline(
      { $and: [match, { status: 'done' }] },
      BOARD_SORT,
      0,
      TASK_BOARD_COLUMN_LIMIT,
    );

    const rows = await TaskModel.aggregate<{ boardOrder: number }>(pipeline).exec();
    expect(rows).toHaveLength(TASK_BOARD_COLUMN_LIMIT);
    const orders = rows.map((row) => row.boardOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));

    expect(docsExamined(await explain(pipeline))).toBeLessThanOrEqual(TASK_BOARD_COLUMN_LIMIT);
  });

  it('reads the default list page (open work, latest first) from the index', async () => {
    const query = taskListQuerySchema.parse({});
    const match = buildTaskFilter(query, actorId, 'hide-unless-included');
    const pipeline = listItemPipeline(
      match,
      taskSortSpec(query.sort, query.order),
      0,
      query.pageSize,
    );

    const rows = await TaskModel.aggregate<{ status: string; updatedAt: Date }>(pipeline).exec();
    expect(rows).toHaveLength(query.pageSize);
    expect(rows.every((row) => row.status !== 'done')).toBe(true);

    // The index walk stops once the page is full: it reads the done tasks it
    // passes on the way, but nowhere near all the open ones, which a sort
    // after the match would fetch in full before cutting the page.
    expect(docsExamined(await explain(pipeline))).toBeLessThan(OPEN / 2);
  });

  it('still sorts by priority and due date, with the worked-out keys left out of each row', async () => {
    const query = taskListQuerySchema.parse({ sort: 'priority', order: 'desc' });
    const match = buildTaskFilter(query, actorId, 'hide-unless-included');
    const rows = await TaskModel.aggregate<Record<string, unknown>>(
      listItemPipeline(match, taskSortSpec(query.sort, query.order), 0, 5),
    ).exec();
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row).not.toHaveProperty('_priorityRank');
      expect(row).not.toHaveProperty('_dueMissing');
      expect(row).not.toHaveProperty('description');
      expect(row).toHaveProperty('checklistTotal', 0);
    }
  });
});
