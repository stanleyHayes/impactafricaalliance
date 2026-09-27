import { FILE_RESOURCE_TYPES, type FileAsset } from '@iaa/shared';
import { Schema, type Types } from 'mongoose';

import { mediaSubSchema } from './model-helpers.js';

/**
 * Pieces of Mongoose schema shared by the work modules: projects, tasks,
 * forms, applications and impact stories.
 */

/**
 * A reference to a colleague's account.
 *
 * Stored as an ObjectId with `ref: 'User'` rather than the string ids older
 * modules use, so a lookup by person can use an index and the people
 * directory can resolve names in one query. Mongoose does not check that the
 * user exists; the services do (plan D16).
 */
export const userRef = (options: { required?: boolean } = {}) => ({
  type: Schema.Types.ObjectId,
  ref: 'User',
  ...options,
});

/** A list of colleagues, such as a project's members or a task's assignees. */
export const userRefList = () => ({ type: [userRef()], default: [] });

/**
 * A stored file: the embedded Cloudinary asset plus what a document list
 * shows. Mirrors `fileAssetSchema` in `@iaa/shared`.
 */
export const fileAssetSubSchema = mediaSubSchema.clone().add({
  format: { type: String },
  bytes: { type: Number },
  resourceType: { type: String, enum: FILE_RESOURCE_TYPES },
  originalFilename: { type: String },
});

/** A document attached to a project or a task, as stored. */
export interface FileAttachmentRecord {
  id: string;
  name: string;
  file: FileAsset;
  addedBy?: Types.ObjectId | null;
  addedAt: Date;
}

/** Mirrors the `FileAttachment` DTO, with the person stored as an id. */
export const fileAttachmentSubSchema = new Schema<FileAttachmentRecord>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    file: { type: fileAssetSubSchema, required: true },
    addedBy: userRef(),
    addedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);
