import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';
import { userRef, userRefList } from '../../common/work-model-helpers.js';

/**
 * A comment on a task. Its own collection rather than an array on the task,
 * so a long discussion never makes the task document heavy to load on the
 * board, and comments can be paged.
 */
export interface TaskCommentDocument {
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  /** Markdown. */
  body: string;
  /**
   * Colleagues mentioned with a token (`@[Name](<id>)`, see `TASK_MENTION_PATTERN`),
   * checked as active when the comment was saved.
   */
  mentions: Types.ObjectId[];
  /** Set when the author edits the text, so the page can say "edited". */
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskCommentHydrated = HydratedDocument<TaskCommentDocument>;

const taskCommentSchema = new Schema<TaskCommentDocument>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    authorId: userRef({ required: true }),
    body: { type: String, required: true, trim: true },
    mentions: userRefList(),
    editedAt: { type: Date },
  },
  { ...baseSchemaOptions, collection: 'taskcomments' },
);

// A task's comments, oldest first, and removing them with the task.
taskCommentSchema.index({ taskId: 1, createdAt: 1 });

export const TaskCommentModel = model<TaskCommentDocument>('TaskComment', taskCommentSchema);
