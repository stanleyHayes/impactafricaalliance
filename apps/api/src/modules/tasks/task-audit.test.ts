import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
  projectIdsToName,
  readableTaskChanges,
  taskIdsToName,
  type AuditNames,
} from './task-audit.js';
import type { StoredTask } from './task-presenter.js';

const oid = (): Types.ObjectId => new Types.ObjectId();

const stored = (overrides: Partial<StoredTask> = {}): StoredTask =>
  ({
    _id: oid(),
    key: 'IAA-7',
    number: 7,
    title: 'Print the programmes',
    status: 'todo',
    assigneeIds: [],
    dependencyIds: [],
    ...overrides,
  }) as StoredTask;

describe('readableTaskChanges', () => {
  const water = oid();
  const stem = oid();
  const parent = oid();
  const gone = oid();
  const names: AuditNames = {
    project: {
      from: { title: 'Clean water', milestones: new Map([['survey', 'Site survey']]) },
      to: { title: 'Girls in STEM', milestones: new Map([['launch', 'Launch event']]) },
    },
    tasks: new Map([[parent.toString(), 'IAA-3']]),
  };

  it('names projects, milestones and tasks instead of showing their ids', () => {
    const before = stored({ projectId: water, milestoneId: 'survey', dependencyIds: [] });
    const after = stored({
      projectId: stem,
      milestoneId: 'launch',
      parentTaskId: parent,
      dependencyIds: [parent, gone],
    });
    const changes = readableTaskChanges(
      [
        { field: 'projectId', from: water.toString(), to: stem.toString() },
        { field: 'milestoneId', from: 'survey', to: 'launch' },
        { field: 'parentTaskId', from: null, to: parent.toString() },
        { field: 'dependencyIds', from: null, to: `${parent.toString()}, ${gone.toString()}` },
      ],
      before,
      after,
      names,
    );
    expect(changes).toEqual([
      { field: 'project', from: 'Clean water', to: 'Girls in STEM' },
      { field: 'milestone', from: 'Site survey', to: 'Launch event' },
      { field: 'parentTask', from: null, to: 'IAA-3' },
      { field: 'dependencies', from: null, to: 'IAA-3, a deleted task' },
    ]);
  });

  it('shows dates as calendar days and the estimate in hours', () => {
    const before = stored({ dueDate: new Date('2026-10-05T12:00:00.000Z'), estimateHours: 1 });
    const after = stored({ dueDate: null, estimateHours: 6 });
    expect(
      readableTaskChanges(
        [
          { field: 'dueDate', from: '2026-10-05T12:00:00.000Z', to: null },
          { field: 'estimateHours', from: '1', to: '6' },
          { field: 'title', from: 'Old', to: 'New' },
        ],
        before,
        after,
        names,
      ),
    ).toEqual([
      { field: 'dueDate', from: '5 Oct 2026', to: null },
      { field: 'estimate', from: '1 hour', to: '6 hours' },
      { field: 'title', from: 'Old', to: 'New' },
    ]);
  });
});

describe('which names an edit needs', () => {
  it('looks projects up only when the project or milestone changed', () => {
    const before = stored({ projectId: oid() });
    const after = stored({ projectId: oid() });
    expect(projectIdsToName([{ field: 'title' }], before, after)).toEqual([]);
    expect(projectIdsToName([{ field: 'milestoneId' }], before, after)).toHaveLength(2);
  });

  it('looks tasks up only when the parent or dependencies changed', () => {
    const shared = oid();
    const before = stored({ parentTaskId: shared, dependencyIds: [shared] });
    const after = stored({ parentTaskId: null, dependencyIds: [shared, oid()] });
    expect(taskIdsToName([{ field: 'dueDate' }], before, after)).toEqual([]);
    expect(taskIdsToName([{ field: 'dependencyIds' }], before, after)).toHaveLength(2);
  });
});
