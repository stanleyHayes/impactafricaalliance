import { CONTENT_STATUSES, ContentStatus, type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface StoryDocument {
  name: string;
  slug: string;
  country: string;
  program: string;
  quote: string;
  narrative: string;
  photo?: MediaAsset;
  featured: boolean;
  status: ContentStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new Schema<StoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    country: { type: String, required: true, trim: true },
    program: { type: String, required: true, trim: true },
    quote: { type: String, required: true },
    narrative: { type: String, required: true },
    photo: { type: mediaSubSchema, required: false },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: CONTENT_STATUSES, default: ContentStatus.Draft, index: true },
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

export const StoryModel = model<StoryDocument>('Story', storySchema);
