import { describe, expect, it } from 'vitest';

import {
  completedAtAfter,
  describeFieldChanges,
  dueBeforeStart,
  MAX_PARENT_DEPTH,
  toStoredCalendarDate,
  uniqueIds,
  uniqueLabels,
  wouldCreateParentLoop,
} from './task-rules.js';

describe('completedAtAfter', () => {
  const now = new Date('2026-10-05T09:30:00.000Z');
  const earlier = new Date('2026-10-01T15:00:00.000Z');

  it('stamps the time on entering done', () => {
    expect(completedAtAfter({ status: 'review' }, 'done', now)).toBe(now);
  });

  it('keeps the first stamp when a done task stays done', () => {
    expect(completedAtAfter({ status: 'done', completedAt: earlier }, 'done', now)).toBe(earlier);
  });

  it('stamps a done task that somehow has no time yet', () => {
    expect(completedAtAfter({ status: 'done', completedAt: null }, 'done', now)).toBe(now);
  });

  it('clears the stamp on leaving done', () => {
    expect(completedAtAfter({ status: 'done', completedAt: earlier }, 'todo', now)).toBeNull();
    expect(completedAtAfter({ status: 'blocked' }, 'in-progress', now)).toBeNull();
  });
});

describe('toStoredCalendarDate', () => {
  it('stores every calendar day at noon UTC', () => {
    expect(toStoredCalendarDate('2026-10-05T00:00:00.000Z')?.toISOString()).toBe(
      '2026-10-05T12:00:00.000Z',
    );
    expect(toStoredCalendarDate('2026-10-05T23:59:59.000Z')?.toISOString()).toBe(
      '2026-10-05T12:00:00.000Z',
    );
  });

  it('passes "not sent" and "clear it" through unchanged', () => {
    expect(toStoredCalendarDate(undefined)).toBeUndefined();
    expect(toStoredCalendarDate(null)).toBeNull();
  });
});

describe('dueBeforeStart', () => {
  const start = new Date('2026-10-05T12:00:00.000Z');

  it('only objects when both dates are set and the due date comes first', () => {
    expect(dueBeforeStart(start, new Date('2026-10-04T12:00:00.000Z'))).toBe(true);
    expect(dueBeforeStart(start, start)).toBe(false);
    expect(dueBeforeStart(start, null)).toBe(false);
    expect(dueBeforeStart(null, new Date('2026-10-04T12:00:00.000Z'))).toBe(false);
  });
});

describe('wouldCreateParentLoop', () => {
  // child -> parent links, as stored
  const parents: Record<string, string | null> = {
    grandchild: 'child',
    child: 'root',
    root: null,
    looped: 'looped',
  };
  const parentOf = async (id: string): Promise<string | null> => parents[id] ?? null;

  it('allows a parent that is not below the task', async () => {
    expect(await wouldCreateParentLoop('grandchild', 'root', parentOf)).toBe(false);
    expect(await wouldCreateParentLoop('other', 'grandchild', parentOf)).toBe(false);
  });

  it('refuses the task itself and anything beneath it', async () => {
    expect(await wouldCreateParentLoop('root', 'root', parentOf)).toBe(true);
    expect(await wouldCreateParentLoop('root', 'grandchild', parentOf)).toBe(true);
    expect(await wouldCreateParentLoop('child', 'grandchild', parentOf)).toBe(true);
  });

  it('refuses to build on a chain that already loops', async () => {
    expect(await wouldCreateParentLoop('other', 'looped', parentOf)).toBe(true);
  });

  it('gives up on a chain deeper than any real plan', async () => {
    const endless = async (id: string): Promise<string> => `${id}+`;
    expect(await wouldCreateParentLoop('task', 'start', endless)).toBe(true);
    let steps = 0;
    await wouldCreateParentLoop('task', 'start', async (id) => {
      steps += 1;
      return `${id}+`;
    });
    expect(steps).toBe(MAX_PARENT_DEPTH);
  });
});

describe('small helpers', () => {
  it('compares ids without regard to case', () => {
    expect(uniqueIds(['64B7F0C2A1B2C3D4E5F60718', '64b7f0c2a1b2c3d4e5f60718'])).toEqual([
      '64b7f0c2a1b2c3d4e5f60718',
    ]);
  });

  it('treats labels differing only in case as one', () => {
    expect(uniqueLabels(['Finance', 'finance', 'Events'])).toEqual(['Finance', 'Events']);
  });

  it('names changed fields in a sentence', () => {
    expect(describeFieldChanges(['title'])).toBe('Changed the title');
    expect(describeFieldChanges(['title', 'dueDate', 'projectId'])).toBe(
      'Changed the title, due date and project',
    );
  });
});
