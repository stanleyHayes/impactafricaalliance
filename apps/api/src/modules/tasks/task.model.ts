import { TASK_STATUSES, WORK_PRIORITIES, type TaskStatus, type WorkPriority } from '@iaa/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';
import {
  fileAttachmentSubSchema,
  userRef,
  userRefList,
  type FileAttachmentRecord,
} from '../../common/work-model-helpers.js';

/**
 * The task data contract (plan §2, `packages/shared/src/schemas/task.ts`).
 * Calendar dates are stored as Dates at noon UTC (plan D6); people as user ids.
 */

export interface ChecklistItemRecord {
  id: string;
  text: string;
  done: boolean;
  doneAt?: Date | null;
  doneBy?: Types.ObjectId | null;
}

export interface TaskDocument {
  /** `IAA-<number>`, kept alongside the number so it can be searched as text. */
  key: string;
  /** From `nextSequence('task')`; never reused. */
  number: number;
  title: string;
  /** Markdown. */
  description: string;
  status: TaskStatus;
  priority: WorkPriority;
  assigneeIds: Types.ObjectId[];
  projectId?: Types.ObjectId | null;
  /** A milestone's stable id on the task's project. */
  milestoneId?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimateHours?: number | null;
  labels: string[];
  checklist: ChecklistItemRecord[];
  attachments: FileAttachmentRecord[];
  parentTaskId?: Types.ObjectId | null;
  dependencyIds: Types.ObjectId[];
  /** Position within the status column; see `boardOrderBetween` in `@iaa/shared`. */
  boardOrder: number;
  commentCount: number;
  completedAt?: Date | null;
  archivedAt?: Date | null;
  /** The reporter: whoever created the task. */
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskHydrated = HydratedDocument<TaskDocument>;

const checklistItemSubSchema = new Schema<ChecklistItemRecord>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    doneAt: { type: Date },
    doneBy: userRef(),
  },
  { _id: false },
);

const taskSchema = new Schema<TaskDocument>(
  {
    key: { type: String, required: true, trim: true },
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    priority: { type: String, enum: WORK_PRIORITIES, default: 'medium' },
    assigneeIds: userRefList(),
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    milestoneId: { type: String },
    startDate: { type: Date },
    dueDate: { type: Date },
    estimateHours: { type: Number },
    labels: { type: [String], default: [] },
    checklist: { type: [checklistItemSubSchema], default: [] },
    attachments: { type: [fileAttachmentSubSchema], default: [] },
    parentTaskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    dependencyIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Task' }], default: [] },
    // The service places each new card; 0 is only a floor so a missed
    // placement sorts sensibly rather than failing the save.
    boardOrder: { type: Number, required: true, default: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date },
    archivedAt: { type: Date },
    createdBy: userRef(),
    updatedBy: userRef(),
  },
  { ...baseSchemaOptions, collection: 'tasks' },
);

// `GET /tasks/IAA-42` looks a task up by key, and no two tasks may share one.
taskSchema.index({ key: 1 }, { unique: true });
// Sorting by key sorts by number; unique as a second guard on the counter.
taskSchema.index({ number: 1 }, { unique: true });
// Each board column: one status, in board order.
taskSchema.index({ status: 1, boardOrder: 1 });
// "My tasks" and the nav badge: my work, by status (multikey).
taskSchema.index({ assigneeIds: 1, status: 1 });
// A project's Tasks tab and its progress counts.
taskSchema.index({ projectId: 1, status: 1 });
// Due buckets and the "due" sort.
taskSchema.index({ dueDate: 1 });
// A task's subtasks.
taskSchema.index({ parentTaskId: 1 });
// Lists and the board leave archived tasks out unless asked.
taskSchema.index({ archivedAt: 1 });

export const TaskModel = model<TaskDocument>('Task', taskSchema);
