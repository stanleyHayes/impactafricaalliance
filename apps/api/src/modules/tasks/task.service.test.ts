import { UserRole } from '@iaa/shared';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../common/errors.js';
import type { AppLogger } from '../../config/logger.js';
import type { AuditService } from '../audit/audit.service.js';
import type { PeopleService } from '../people/people.service.js';

import type { TaskEventPublisher } from './task-events.js';
import type { StoredTask } from './task-presenter.js';
import type { TaskQueryService } from './task-query.service.js';
import type { TaskActor } from './task-rules.js';
import { TaskModel } from './task.model.js';
import { TaskService } from './task.service.js';

const actor: TaskActor = {
  id: '64b7f0c2a1b2c3d4e5f60718',
  email: 'esi@iaa.test',
  role: UserRole.Editor,
};

const oid = (): Types.ObjectId => new Types.ObjectId();

const storedTask = (overrides: Partial<StoredTask> = {}): StoredTask =>
  ({
    _id: oid(),
    key: 'IAA-7',
    number: 7,
    title: 'Print the programmes',
    description: '',
    status: 'review',
    priority: 'medium',
    assigneeIds: [],
    labels: [],
    checklist: [],
    attachments: [],
    dependencyIds: [],
    boardOrder: 1024,
    commentCount: 0,
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    ...overrides,
  }) as StoredTask;

/** A Mongoose query chain that resolves to `value` however it is finished. */
const chain = (value: unknown) => {
  const query = {
    sort: () => query,
    lean: () => query,
    exec: () => Promise.resolve(value),
  };
  return query;
};

const build = (before: StoredTask) => {
  const reader = {
    findStored: vi.fn().mockResolvedValue(before),
    present: vi.fn(async (task: StoredTask) => ({ id: task._id.toString(), status: task.status })),
  };
  const people = {
    assertActive: vi.fn().mockResolvedValue(undefined),
    summaries: vi.fn().mockResolvedValue(new Map()),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const events = { publish: vi.fn().mockResolvedValue(undefined) };
  const logger = { error: vi.fn(), debug: vi.fn() };
  const service = new TaskService(
    reader as unknown as TaskQueryService,
    people as unknown as PeopleService,
    audit as unknown as AuditService,
    events as unknown as TaskEventPublisher,
    logger as unknown as AppLogger,
  );
  return { service, reader, people, audit, events, logger };
};

/** Records each update sent to the database and answers with the task it would produce. */
const captureUpdates = (before: StoredTask) => {
  const updates: Record<string, Record<string, unknown>>[] = [];
  vi.spyOn(TaskModel, 'findOneAndUpdate').mockImplementation(((
    _filter: unknown,
    update: Record<string, Record<string, unknown>>,
  ) => {
    updates.push(update);
    return chain({ ...before, ...update.$set, updatedAt: new Date() });
  }) as never);
  return updates;
};

afterEach(() => vi.restoreAllMocks());

describe('moving a task on the board', () => {
  it('stamps completedAt entering done and announces the change', async () => {
    const before = storedTask({ status: 'review' });
    const { service, events, audit } = build(before);
    const updates = captureUpdates(before);

    await service.move(before._id.toString(), { status: 'done', boardOrder: 3 }, actor);

    expect(updates[0]?.$set).toMatchObject({ status: 'done', boardOrder: 3, updatedBy: actor.id });
    expect(updates[0]?.$set?.completedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'status-changed',
        summary: 'Moved on the board from In review to Done',
      }),
    );
    await vi.waitFor(() =>
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task.status-changed', from: 'review', to: 'done' }),
      ),
    );
  });

  it('clears completedAt leaving done', async () => {
    const before = storedTask({ status: 'done', completedAt: new Date('2026-10-02T09:00:00Z') });
    const { service } = build(before);
    const updates = captureUpdates(before);

    await service.move(before._id.toString(), { status: 'todo', boardOrder: 3 }, actor);

    expect(updates[0]?.$unset).toEqual({ completedAt: '' });
  });

  it('changes nothing when the card is already where the move puts it', async () => {
    const before = storedTask({ status: 'todo', boardOrder: 3 });
    const { service, audit } = build(before);
    const updates = captureUpdates(before);

    await service.move(before._id.toString(), { status: 'todo', boardOrder: 3 }, actor);

    expect(updates).toHaveLength(0);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('still answers when the events boundary fails', async () => {
    const before = storedTask({ status: 'todo' });
    const { service, events, logger } = build(before);
    captureUpdates(before);
    events.publish.mockRejectedValue(new Error('down'));

    await expect(
      service.move(before._id.toString(), { status: 'blocked', boardOrder: 1 }, actor),
    ).resolves.toBeDefined();
    await vi.waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ module: 'tasks', entityId: before._id.toString() }),
        'Failed to publish task event',
      ),
    );
  });
});

describe('editing a task', () => {
  it('puts a card whose status changes at the top of its new column', async () => {
    const before = storedTask({ status: 'todo' });
    const { service } = build(before);
    vi.spyOn(TaskModel, 'findOne').mockReturnValue(chain({ boardOrder: 512 }) as never);
    const updates = captureUpdates(before);

    await service.update(before._id.toString(), { status: 'in-progress' }, actor);

    expect(updates[0]?.$set).toMatchObject({ status: 'in-progress', boardOrder: 512 - 1024 });
  });

  it('refuses a parent that sits below the task', async () => {
    const task = storedTask();
    const child = oid();
    const grandchild = oid();
    const parents = new Map<string, Types.ObjectId | null>([
      [grandchild.toString(), child],
      [child.toString(), task._id],
    ]);
    const { service } = build(task);
    vi.spyOn(TaskModel, 'exists').mockReturnValue(chain({ _id: grandchild }) as never);
    vi.spyOn(TaskModel, 'findById').mockImplementation(((id: unknown) =>
      chain({ parentTaskId: parents.get(String(id)) ?? null })) as never);
    const updates = captureUpdates(task);

    await expect(
      service.update(task._id.toString(), { parentTaskId: grandchild.toString() }, actor),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(updates).toHaveLength(0);
  });

  it('only checks people who are newly assigned', async () => {
    const stays = oid();
    const joins = oid();
    const before = storedTask({ assigneeIds: [stays] });
    const { service, people } = build(before);
    captureUpdates(before);

    await service.update(
      before._id.toString(),
      { assigneeIds: [stays.toString(), joins.toString()] },
      actor,
    );

    expect(people.assertActive).toHaveBeenCalledWith([joins.toString()], 'Assignees');
  });

  it('writes nothing when nothing changes', async () => {
    const before = storedTask({ title: 'Same title' });
    const { service, audit } = build(before);
    const updates = captureUpdates(before);

    await service.update(before._id.toString(), { title: 'Same title', status: 'review' }, actor);

    expect(updates).toHaveLength(0);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
