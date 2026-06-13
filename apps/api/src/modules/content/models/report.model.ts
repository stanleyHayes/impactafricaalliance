import { CONTENT_STATUSES, ContentStatus, type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface ReportDocument {
  title: string;
  description?: string;
  year: number;
  file: MediaAsset;
  status: ContentStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<ReportDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    year: { type: Number, required: true, index: true },
    file: { type: mediaSubSchema, required: true },
    status: { type: String, enum: CONTENT_STATUSES, default: ContentStatus.Draft, index: true },
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

export const ReportModel = model<ReportDocument>('Report', reportSchema);
