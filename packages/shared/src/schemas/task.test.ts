import { describe, expect, it } from 'vitest';

import {
  canTransitionTask,
  checklistItemPatchSchema,
  formatTaskKey,
  isTaskOpen,
  parseTaskKey,
  TASK_BOARD_COLUMNS,
  TASK_KEY_PATTERN,
  TASK_STATUSES,
  taskBoardQuerySchema,
  taskCommentInputSchema,
  taskInputSchema,
  taskListQuerySchema,
  taskMoveSchema,
  taskSummaryQuerySchema,
  taskUpdateSchema,
} from './task.js';

const personId = '64b7f0c2a1b2c3d4e5f60718';
const projectId = '64b7f0c2a1b2c3d4e5f60719';

describe('task statuses', () => {
  it('gives every status exactly one board column', () => {
    expect([...TASK_BOARD_COLUMNS].sort()).toEqual([...TASK_STATUSES].sort());
  });

  it('treats everything but done as open', () => {
    expect(TASK_STATUSES.filter(isTaskOpen)).toEqual([
      'backlog',
      'todo',
      'in-progress',
      'review',
      'blocked',
    ]);
  });

  it('lets a task move from any status to any other', () => {
    for (const from of TASK_STATUSES) {
      for (const to of TASK_STATUSES) {
        expect(canTransitionTask(from, to)).toBe(true);
      }
    }
  });
});

describe('task keys', () => {
  it('formats and reads back the same number', () => {
    expect(formatTaskKey(42)).toBe('IAA-42');
    expect(parseTaskKey('IAA-42')).toBe(42);
    expect(formatTaskKey(7)).toMatch(TASK_KEY_PATTERN);
  });

  it('reads a key typed in any case or with spaces around it', () => {
    expect(parseTaskKey('iaa-7')).toBe(7);
    expect(parseTaskKey(' IAA-3 ')).toBe(3);
  });

  it('refuses text that is not a key', () => {
    expect(parseTaskKey('IAA-0')).toBeNull();
    expect(parseTaskKey('ABC-1')).toBeNull();
    expect(parseTaskKey('IAA-')).toBeNull();
    expect(parseTaskKey(personId)).toBeNull();
  });

  // Twenty nines would round to a different number, and so to a different task.
  it('refuses a number too long to hold exactly', () => {
    expect(parseTaskKey('IAA-99999999999999999999')).toBeNull();
    expect(parseTaskKey(`IAA-${Number.MAX_SAFE_INTEGER}`)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('task create schema', () => {
  it('fills in what a new task starts with', () => {
    expect(taskInputSchema.parse({ title: 'Book the venue' })).toEqual({
      title: 'Book the venue',
      description: '',
      status: 'todo',
      priority: 'medium',
      assigneeIds: [],
      labels: [],
      checklist: [],
      dependencyIds: [],
    });
  });

  it('fills in checklist items and refuses repeated ids', () => {
    expect(
      taskInputSchema.parse({
        title: 'Book the venue',
        checklist: [{ id: 'quote', text: 'Get a quote' }],
      }).checklist,
    ).toEqual([{ id: 'quote', text: 'Get a quote', done: false }]);
    const item = { id: 'quote', text: 'Get a quote' };
    expect(
      taskInputSchema.safeParse({ title: 'Book the venue', checklist: [item, item] }).success,
    ).toBe(false);
  });

  it('caps assignees at ten', () => {
    const assigneeIds = Array.from({ length: 11 }, () => personId);
    expect(taskInputSchema.safeParse({ title: 'Book the venue', assigneeIds }).success).toBe(false);
  });
});

describe('task patch contract', () => {
  it('does not inject create defaults into a partial edit', () => {
    expect(taskUpdateSchema.parse({ title: 'Book a bigger venue' })).toEqual({
      title: 'Book a bigger venue',
    });
  });

  it('leaves the checklist to its own endpoints', () => {
    expect(taskUpdateSchema.parse({ checklist: [{ id: 'a', text: 'b' }] })).toEqual({});
  });

  it('clears optional fields with null', () => {
    expect(
      taskUpdateSchema.parse({
        projectId: null,
        milestoneId: null,
        parentTaskId: null,
        dueDate: null,
        startDate: '',
        estimateHours: null,
      }),
    ).toEqual({
      projectId: null,
      milestoneId: null,
      parentTaskId: null,
      dueDate: null,
      startDate: null,
      estimateHours: null,
    });
  });

  it('refuses to clear the title', () => {
    expect(taskUpdateSchema.safeParse({ title: null }).success).toBe(false);
  });
});

describe('board moves', () => {
  it('needs a status and a finite position', () => {
    expect(taskMoveSchema.parse({ status: 'review', boardOrder: 1536 })).toEqual({
      status: 'review',
      boardOrder: 1536,
    });
    expect(taskMoveSchema.safeParse({ status: 'review', boardOrder: Infinity }).success).toBe(
      false,
    );
    expect(taskMoveSchema.safeParse({ status: 'review', boardOrder: Number.NaN }).success).toBe(
      false,
    );
    expect(taskMoveSchema.safeParse({ boardOrder: 1 }).success).toBe(false);
  });
});

describe('checklist and comments', () => {
  it('patches a checklist line without inventing values', () => {
    expect(checklistItemPatchSchema.parse({})).toEqual({});
    expect(checklistItemPatchSchema.parse({ done: true })).toEqual({ done: true });
  });

  it('trims a comment and refuses a blank one', () => {
    expect(taskCommentInputSchema.parse({ body: '  Venue confirmed @ada  ' })).toEqual({
      body: 'Venue confirmed @ada',
    });
    expect(taskCommentInputSchema.safeParse({ body: '   ' }).success).toBe(false);
  });
});

describe('task list query', () => {
  it('reads a status list, filters and flags', () => {
    expect(
      taskListQuerySchema.parse({
        status: 'todo,in-progress',
        assigneeId: 'me',
        projectId: 'none',
        due: 'overdue',
        today: '2026-10-05',
        includeDone: 'false',
      }),
    ).toEqual({
      page: 1,
      pageSize: 20,
      sort: 'updated',
      order: 'desc',
      status: ['todo', 'in-progress'],
      assigneeId: 'me',
      projectId: 'none',
      due: 'overdue',
      today: '2026-10-05',
      includeDone: false,
    });
  });

  it('accepts a person or a project by id', () => {
    const parsed = taskListQuerySchema.parse({ assigneeId: personId, projectId });
    expect(parsed.assigneeId).toBe(personId);
    expect(parsed.projectId).toBe(projectId);
  });

  it('refuses values it does not understand', () => {
    expect(taskListQuerySchema.safeParse({ status: 'todo,someday' }).success).toBe(false);
    expect(taskListQuerySchema.safeParse({ assigneeId: 'someone' }).success).toBe(false);
    expect(taskListQuerySchema.safeParse({ due: 'soon' }).success).toBe(false);
    expect(taskListQuerySchema.safeParse({ today: '05/10/2026' }).success).toBe(false);
    expect(taskListQuerySchema.safeParse({ sort: 'random' }).success).toBe(false);
  });

  it('gives the board the same filters without paging', () => {
    expect(taskBoardQuerySchema.parse({ page: '2', label: 'finance' })).toEqual({
      label: 'finance',
    });
  });

  it("takes the caller's own day for the summary", () => {
    expect(taskSummaryQuerySchema.parse({ today: '2026-10-05' })).toEqual({ today: '2026-10-05' });
    expect(taskSummaryQuerySchema.parse({})).toEqual({});
  });
});
