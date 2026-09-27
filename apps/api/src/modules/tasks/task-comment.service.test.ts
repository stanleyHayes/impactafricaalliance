import { mentionToken, TASK_MENTION_LIMIT, UserRole } from '@iaa/shared';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ForbiddenError, ValidationError } from '../../common/errors.js';
import type { AppLogger } from '../../config/logger.js';
import type { AuditService } from '../audit/audit.service.js';
import type { PeopleService } from '../people/people.service.js';

import { TaskCommentModel } from './task-comment.model.js';
import { TaskCommentService } from './task-comment.service.js';
import type { TaskEventPublisher } from './task-events.js';
import type { TaskActor } from './task-rules.js';
import { TaskModel } from './task.model.js';

const author: TaskActor = {
  id: '64b7f0c2a1b2c3d4e5f60718',
  email: 'esi@iaa.test',
  role: UserRole.Editor,
};
const admin: TaskActor = {
  id: '64b7f0c2a1b2c3d4e5f60799',
  email: 'ama@iaa.test',
  role: UserRole.Admin,
};
const colleague: TaskActor = {
  id: '64b7f0c2a1b2c3d4e5f60720',
  email: 'kofi@iaa.test',
  role: UserRole.Editor,
};
const taskId = new Types.ObjectId();

const chain = (value: unknown) => {
  const query = { lean: () => query, exec: () => Promise.resolve(value) };
  return query;
};

const build = () => {
  const people = {
    assertActive: vi.fn().mockResolvedValue(undefined),
    summaries: vi.fn().mockResolvedValue(new Map()),
    summary: vi.fn().mockResolvedValue({ name: 'Esi Editor' }),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const events = { publish: vi.fn().mockResolvedValue(undefined) };
  const logger = { error: vi.fn() };
  const service = new TaskCommentService(
    people as unknown as PeopleService,
    audit as unknown as AuditService,
    events as unknown as TaskEventPublisher,
    logger as unknown as AppLogger,
  );
  vi.spyOn(TaskModel, 'findById').mockReturnValue(chain({ _id: taskId, key: 'IAA-3' }) as never);
  const increments = vi.spyOn(TaskModel, 'updateOne').mockReturnValue(chain({}) as never);
  return { service, people, audit, events, increments };
};

const storedComment = (authorId: string, body = 'Hello') => ({
  _id: new Types.ObjectId(),
  taskId,
  authorId: new Types.ObjectId(authorId),
  body,
  mentions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

afterEach(() => vi.restoreAllMocks());

describe('posting a comment', () => {
  it('takes mentions from the tokens in the text, checks them and announces them', async () => {
    const { service, people, events, increments } = build();
    const created = vi.spyOn(TaskCommentModel, 'create').mockImplementation((async (
      doc: Record<string, unknown>,
    ) => ({
      toObject: () => ({
        ...storedComment(author.id),
        ...doc,
        authorId: new Types.ObjectId(author.id),
      }),
    })) as never);
    const body = `${mentionToken({ id: colleague.id, name: 'Kofi' })} and ${mentionToken({ id: author.id, name: 'Esi' })}, please look. @Ama is not a token.`;

    const comment = await service.create(taskId.toString(), body, author);

    expect(people.assertActive).toHaveBeenCalledWith(
      [colleague.id, author.id],
      'Mentioned colleagues',
    );
    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ mentions: [colleague.id, author.id], authorId: author.id }),
    );
    expect(increments).toHaveBeenCalledWith({ _id: taskId }, { $inc: { commentCount: 1 } });
    expect(comment.body).toBe(body);
    // The author is not told about their own mention.
    await vi.waitFor(() =>
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'task.mentioned', mentionedIds: [colleague.id] }),
      ),
    );
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'task.commented' }),
    );
  });

  it('refuses a comment that mentions too many people', async () => {
    const { service } = build();
    const created = vi.spyOn(TaskCommentModel, 'create');
    const body = Array.from({ length: TASK_MENTION_LIMIT + 1 }, () =>
      mentionToken({ id: new Types.ObjectId().toString(), name: 'Someone' }),
    ).join(' ');

    await expect(service.create(taskId.toString(), body, author)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(created).not.toHaveBeenCalled();
  });
});

describe('changing a comment', () => {
  it('lets only the author edit', async () => {
    const { service } = build();
    vi.spyOn(TaskCommentModel, 'findOne').mockReturnValue(chain(storedComment(author.id)) as never);

    await expect(
      service.update(taskId.toString(), new Types.ObjectId().toString(), 'Changed', colleague),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.update(taskId.toString(), new Types.ObjectId().toString(), 'Changed', admin),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('lets the author or an administrator delete, and lowers the count', async () => {
    const { service, increments } = build();
    vi.spyOn(TaskCommentModel, 'findOne').mockReturnValue(chain(storedComment(author.id)) as never);
    vi.spyOn(TaskCommentModel, 'deleteOne').mockReturnValue(chain({ deletedCount: 1 }) as never);

    await expect(
      service.remove(taskId.toString(), new Types.ObjectId().toString(), colleague),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await service.remove(taskId.toString(), new Types.ObjectId().toString(), admin);
    expect(increments).toHaveBeenCalledWith(
      { _id: taskId, commentCount: { $gt: 0 } },
      { $inc: { commentCount: -1 } },
    );
  });
});
