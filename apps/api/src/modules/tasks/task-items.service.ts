import {
  newStableId,
  TASK_ATTACHMENT_LIMIT,
  TASK_CHECKLIST_LIMIT,
  type ChecklistItemInput,
  type ChecklistItemPatch,
  type Task,
  type TaskAttachmentInput,
} from '@iaa/shared';
import { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { ConflictError, NotFoundError } from '../../common/errors.js';
import { AuditService } from '../audit/audit.service.js';

import type { StoredTask } from './task-presenter.js';
import { TaskQueryService } from './task-query.service.js';
import type { TaskActor } from './task-rules.js';
import { TaskModel } from './task.model.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * The actor as a stored reference. Positional updates (`checklist.$.doneBy`)
 * are cast less reliably than top-level fields, so the id is converted here.
 */
const actorRef = (actor: TaskActor): Types.ObjectId | undefined =>
  OBJECT_ID.test(actor.id) ? new Types.ObjectId(actor.id) : undefined;

/** Room left in an array, as a filter: the push only matches while under the limit. */
const hasRoom = (field: 'checklist' | 'attachments', limit: number) => ({
  $expr: { $lt: [{ $size: { $ifNull: [`$${field}`, []] } }, limit] },
});

/**
 * A task's checklist and attached documents.
 *
 * Each change is one atomic update on the item it touches, never a rewrite of
 * the whole array: two colleagues ticking different lines at the same moment
 * both keep their tick, and a document added while someone else removes
 * another is not lost (plan §3.3). Removing something already gone succeeds,
 * so the API client's automatic retry of a DELETE never reports a failure for
 * work that was done.
 */
@injectable()
export class TaskItemsService {
  constructor(
    @inject(TaskQueryService) private readonly reader: TaskQueryService,
    @inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Add a line to the end of the checklist. 409 once it holds `TASK_CHECKLIST_LIMIT`. */
  async addChecklistItem(id: string, input: ChecklistItemInput, actor: TaskActor): Promise<Task> {
    const task = await this.reader.findStored(id);
    const item = { id: newStableId('item'), text: input.text, done: false };
    const updated = await TaskModel.findOneAndUpdate(
      { _id: task._id, ...hasRoom('checklist', TASK_CHECKLIST_LIMIT) },
      { $push: { checklist: item }, $set: { updatedBy: actor.id } },
      { returnDocument: 'after' },
    )
      .lean<StoredTask>()
      .exec();
    if (!updated) {
      throw new ConflictError(
        `A checklist holds at most ${TASK_CHECKLIST_LIMIT} items. Remove one to add another.`,
      );
    }
    await this.record(updated, actor, `Added “${item.text}” to the checklist`);
    return this.reader.present(updated);
  }

  /**
   * Reword or tick one line. Ticking stamps who and when; unticking clears
   * both. Ticking a line that is already ticked keeps the first stamp, so a
   * retried request does not move it.
   */
  async updateChecklistItem(
    id: string,
    itemId: string,
    patch: ChecklistItemPatch,
    actor: TaskActor,
  ): Promise<Task> {
    const task = await this.reader.findStored(id);
    const item = (task.checklist ?? []).find((candidate) => candidate.id === itemId);
    if (!item) {
      throw new NotFoundError('Checklist item');
    }
    const set: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};
    const reworded = patch.text !== undefined && patch.text !== item.text;
    const ticked = patch.done !== undefined && patch.done !== item.done;
    if (reworded) {
      set['checklist.$.text'] = patch.text;
    }
    if (ticked && patch.done) {
      Object.assign(set, {
        'checklist.$.done': true,
        'checklist.$.doneAt': new Date(),
        'checklist.$.doneBy': actorRef(actor),
      });
    } else if (ticked) {
      set['checklist.$.done'] = false;
      Object.assign(unset, { 'checklist.$.doneAt': '', 'checklist.$.doneBy': '' });
    }
    if (!reworded && !ticked) {
      return this.reader.present(task);
    }
    const updated = await TaskModel.findOneAndUpdate(
      { _id: task._id, 'checklist.id': itemId },
      {
        $set: { ...set, updatedBy: actor.id },
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      },
      { returnDocument: 'after' },
    )
      .lean<StoredTask>()
      .exec();
    if (!updated) {
      // Removed by someone else between the read and the write.
      throw new NotFoundError('Checklist item');
    }
    const text = patch.text ?? item.text;
    await this.record(updated, actor, this.checklistSummary(reworded, ticked, patch.done, text));
    return this.reader.present(updated);
  }

  /** Remove one line. Already gone counts as done. */
  async removeChecklistItem(id: string, itemId: string, actor: TaskActor): Promise<Task> {
    const task = await this.reader.findStored(id);
    const item = (task.checklist ?? []).find((candidate) => candidate.id === itemId);
    if (!item) {
      return this.reader.present(task);
    }
    const updated = await this.pull(task, { checklist: { id: itemId } }, actor);
    await this.record(updated, actor, `Removed “${item.text}” from the checklist`);
    return this.reader.present(updated);
  }

  /** Attach a document. 409 once the task holds `TASK_ATTACHMENT_LIMIT`. */
  async addAttachment(id: string, input: TaskAttachmentInput, actor: TaskActor): Promise<Task> {
    const task = await this.reader.findStored(id);
    const attachment = {
      id: newStableId('file'),
      name: input.name,
      file: input.file,
      addedBy: actorRef(actor),
      addedAt: new Date(),
    };
    const updated = await TaskModel.findOneAndUpdate(
      { _id: task._id, ...hasRoom('attachments', TASK_ATTACHMENT_LIMIT) },
      { $push: { attachments: attachment }, $set: { updatedBy: actor.id } },
      { returnDocument: 'after' },
    )
      .lean<StoredTask>()
      .exec();
    if (!updated) {
      throw new ConflictError(
        `A task holds at most ${TASK_ATTACHMENT_LIMIT} documents. Remove one to add another.`,
      );
    }
    await this.record(updated, actor, `Attached “${attachment.name}”`);
    return this.reader.present(updated);
  }

  /**
   * Take a document off the task. The file itself stays in Cloudinary: other
   * records may link to it, and a removal someone regrets can be undone by
   * attaching the same link again.
   */
  async removeAttachment(id: string, attachmentId: string, actor: TaskActor): Promise<Task> {
    const task = await this.reader.findStored(id);
    const file = (task.attachments ?? []).find((candidate) => candidate.id === attachmentId);
    if (!file) {
      return this.reader.present(task);
    }
    const updated = await this.pull(task, { attachments: { id: attachmentId } }, actor);
    await this.record(updated, actor, `Removed the document “${file.name}”`);
    return this.reader.present(updated);
  }

  private async pull(
    task: StoredTask,
    pull: Record<string, unknown>,
    actor: TaskActor,
  ): Promise<StoredTask> {
    const updated = await TaskModel.findOneAndUpdate(
      { _id: task._id },
      { $pull: pull, $set: { updatedBy: actor.id } },
      { returnDocument: 'after' },
    )
      .lean<StoredTask>()
      .exec();
    if (!updated) {
      throw new NotFoundError('Task');
    }
    return updated;
  }

  private checklistSummary(
    reworded: boolean,
    ticked: boolean,
    done: boolean | undefined,
    text: string,
  ): string {
    if (ticked) {
      return done ? `Ticked “${text}”` : `Unticked “${text}”`;
    }
    return reworded ? `Reworded a checklist item to “${text}”` : `Changed “${text}”`;
  }

  private async record(task: StoredTask, actor: TaskActor, summary: string): Promise<void> {
    await this.audit.record({
      module: 'tasks',
      entityType: 'task',
      entityId: task._id,
      action: 'updated',
      actorId: actor.id,
      actorEmail: actor.email,
      summary,
    });
  }
}
