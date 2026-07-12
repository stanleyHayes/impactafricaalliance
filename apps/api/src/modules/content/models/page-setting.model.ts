import { CONTENT_STATUSES, ContentStatus, type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface PageSettingDocument {
  pageKey: string;
  heroImage?: MediaAsset;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const pageSettingSchema = new Schema<PageSettingDocument>(
  {
    pageKey: { type: String, required: true, unique: true, index: true },
    heroImage: { type: mediaSubSchema, required: false },
    status: { type: String, enum: CONTENT_STATUSES, default: ContentStatus.Draft, index: true },
  },
  baseSchemaOptions,
);

export const PageSettingModel = model<PageSettingDocument>('PageSetting', pageSettingSchema);
