import {
  extractMentionIds,
  TASK_MENTION_LIMIT,
  UserRole,
  type Paginated,
  type PersonSummary,
  type TaskComment,
} from '@iaa/shared';
import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';
import { AuditService } from '../audit/audit.service.js';
import { PeopleService } from '../people/people.service.js';

import { TaskCommentModel, type TaskCommentDocument } from './task-comment.model.js';
import { announceTaskEvents, type TaskEvent, type TaskEventPublisher } from './task-events.js';
import { listInWords, type TaskActor } from './task-rules.js';
import { TaskModel } from './task.model.js';

type StoredComment = TaskCommentDocument & { _id: Types.ObjectId };

interface TaskHead {
  _id: Types.ObjectId;
  key: string;
}

const toCommentDto = (
  comment: StoredComment,
  people: ReadonlyMap<string, PersonSummary>,
): TaskComment => ({
  id: comment._id.toString(),
  taskId: comment.taskId.toString(),
  author: people.get(comment.authorId.toString()) ?? null,
  body: comment.body,
  mentions: (comment.mentions ?? []).map(String),
  createdAt: comment.createdAt.toISOString(),
  updatedAt: comment.updatedAt.toISOString(),
  ...(comment.editedAt ? { editedAt: comment.editedAt.toISOString() } : {}),
});

/**
 * Comments on a task: the conversation beside the work.
 *
 * Mentions arrive as tokens (`@[Name](<id>)`, see `TASK_MENTION_PATTERN`).
 * The ids are taken from the text here, never from a separate list a browser
 * could fill with anything, and each must be an active colleague. Only the
 * author may edit a comment; the author or an administrator may delete one.
 */
@injectable()
export class TaskCommentService {
  constructor(
    @inject(PeopleService) private readonly people: PeopleService,
    @inject(AuditService) private readonly audit: AuditService,
    @inject(TOKENS.TaskEvents) private readonly events: TaskEventPublisher,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /** A page of a task's comments, oldest first, as a conversation reads. */
  async list(taskId: string, page: number, pageSize: number): Promise<Paginated<TaskComment>> {
    const task = await this.findTask(taskId);
    const filter = { taskId: task._id };
    const [comments, total] = await Promise.all([
      TaskCommentModel.find(filter)
        .sort({ createdAt: 1, _id: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<StoredComment[]>()
        .exec(),
      TaskCommentModel.countDocuments(filter).exec(),
    ]);
    const people = await this.people.summaries(comments.map((comment) => comment.authorId));
    return paginate(
      comments.map((comment) => toCommentDto(comment, people)),
      total,
      page,
      pageSize,
    );
  }

  /**
   * Post a comment. The task's `commentCount` goes up in the same breath with
   * `$inc`, so two comments posted together both count.
   */
  async create(taskId: string, body: string, actor: TaskActor): Promise<TaskComment> {
    const task = await this.findTask(taskId);
    const mentions = await this.mentionsIn(body);
    const created = await TaskCommentModel.create({
      taskId: task._id,
      authorId: actor.id,
      body,
      mentions,
    });
    await TaskModel.updateOne({ _id: task._id }, { $inc: { commentCount: 1 } }).exec();
    const comment = created.toObject() as StoredComment;

    const mentioned = mentions.filter((id) => id !== actor.id.toLowerCase());
    await this.record(task, actor, 'commented', await this.commentSummary('Commented', mentioned));
    const base = this.eventBase(task, actor, comment._id.toString());
    const events: TaskEvent[] = [{ ...base, type: 'task.commented' }];
    if (mentioned.length > 0) {
      events.push({ ...base, type: 'task.mentioned', mentionedIds: mentioned });
    }
    announceTaskEvents(this.events, this.logger, events);
    return this.present(comment);
  }

  /**
   * Edit your own comment. `editedAt` is stamped so the page can say so.
   * Only colleagues mentioned for the first time are announced: someone
   * already mentioned was told when the comment was posted.
   */
  async update(
    taskId: string,
    commentId: string,
    body: string,
    actor: TaskActor,
  ): Promise<TaskComment> {
    const task = await this.findTask(taskId);
    const comment = await this.findComment(task, commentId);
    if (comment.authorId.toString() !== actor.id.toLowerCase()) {
      throw new ForbiddenError('Only the person who wrote a comment can edit it');
    }
    if (comment.body === body) {
      return this.present(comment);
    }
    const mentions = await this.mentionsIn(body);
    const updated = await TaskCommentModel.findOneAndUpdate(
      { _id: comment._id },
      { $set: { body, mentions, editedAt: new Date() } },
      { returnDocument: 'after' },
    )
      .lean<StoredComment>()
      .exec();
    if (!updated) {
      throw new NotFoundError('Comment');
    }
    const before = new Set((comment.mentions ?? []).map(String));
    const newlyMentioned = mentions.filter(
      (id) => !before.has(id) && id !== actor.id.toLowerCase(),
    );
    await this.record(task, actor, 'updated', 'Edited a comment');
    if (newlyMentioned.length > 0) {
      announceTaskEvents(this.events, this.logger, [
        {
          ...this.eventBase(task, actor, comment._id.toString()),
          type: 'task.mentioned',
          mentionedIds: newlyMentioned,
        },
      ]);
    }
    return this.present(updated);
  }

  /**
   * Delete a comment: its author may, and so may an administrator, who looks
   * after what the team writes. The count only goes down while above zero, so
   * a count already out of step can never go negative.
   */
  async remove(taskId: string, commentId: string, actor: TaskActor): Promise<void> {
    const task = await this.findTask(taskId);
    const comment = await this.findComment(task, commentId);
    const isAuthor = comment.authorId.toString() === actor.id.toLowerCase();
    if (!isAuthor && actor.role !== UserRole.Admin) {
      throw new ForbiddenError(
        'Only the person who wrote a comment, or an administrator, can delete it',
      );
    }
    const removed = await TaskCommentModel.deleteOne({ _id: comment._id }).exec();
    if (removed.deletedCount > 0) {
      await TaskModel.updateOne(
        { _id: task._id, commentCount: { $gt: 0 } },
        { $inc: { commentCount: -1 } },
      ).exec();
    }
    let summary = 'Deleted a comment';
    if (!isAuthor) {
      const author = await this.people.summary(comment.authorId);
      summary = `Deleted a comment by ${author?.name ?? 'a former colleague'}`;
    }
    await this.record(task, actor, 'deleted', summary);
  }

  /**
   * The colleagues a comment mentions: every token's id, each checked as an
   * active account. A token naming anyone else is refused rather than
   * quietly dropped, so the author knows the person was not told.
   */
  private async mentionsIn(body: string): Promise<string[]> {
    const ids = extractMentionIds(body);
    if (ids.length > TASK_MENTION_LIMIT) {
      throw new ValidationError(`Mention at most ${TASK_MENTION_LIMIT} colleagues in one comment`, [
        {
          path: 'body',
          message: `Mention at most ${TASK_MENTION_LIMIT} colleagues in one comment`,
        },
      ]);
    }
    try {
      await this.people.assertActive(ids, 'Mentioned colleagues');
    } catch (err) {
      if (!(err instanceof ValidationError)) {
        throw err;
      }
      // Pointed at the comment box, with the ids, so the composer can say who.
      const message = 'Mention only colleagues who are active members of the team';
      const missing = Array.isArray(err.details) ? err.details.map(String) : [];
      throw new ValidationError(message, [{ path: 'body', message, ids: missing }]);
    }
    return ids;
  }

  private async findTask(taskId: string): Promise<TaskHead> {
    const task = await TaskModel.findById(taskId, { key: 1 }).lean<TaskHead>().exec();
    if (!task) {
      throw new NotFoundError('Task');
    }
    return task;
  }

  private async findComment(task: TaskHead, commentId: string): Promise<StoredComment> {
    const comment = await TaskCommentModel.findOne({ _id: commentId, taskId: task._id })
      .lean<StoredComment>()
      .exec();
    if (!comment) {
      throw new NotFoundError('Comment');
    }
    return comment;
  }

  private async present(comment: StoredComment): Promise<TaskComment> {
    return toCommentDto(comment, await this.people.summaries([comment.authorId]));
  }

  private async commentSummary(verb: string, mentioned: readonly string[]): Promise<string> {
    if (mentioned.length === 0) {
      return verb;
    }
    const people = await this.people.summaries(mentioned);
    const names = mentioned.map((id) => people.get(id)?.name ?? 'a colleague');
    return `${verb}, mentioning ${listInWords(names)}`;
  }

  private eventBase(task: TaskHead, actor: TaskActor, commentId: string) {
    return {
      taskId: task._id.toString(),
      taskKey: task.key,
      actorId: actor.id,
      at: new Date().toISOString(),
      commentId,
    };
  }

  private async record(
    task: TaskHead,
    actor: TaskActor,
    action: 'commented' | 'updated' | 'deleted',
    summary: string,
  ): Promise<void> {
    await this.audit.record({
      module: 'tasks',
      entityType: 'task',
      entityId: task._id,
      action,
      actorId: actor.id,
      actorEmail: actor.email,
      summary,
    });
  }
}
