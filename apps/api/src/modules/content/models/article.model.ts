import { CONTENT_STATUSES, ContentStatus, type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface ArticleDocument {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage?: MediaAsset;
  tags: string[];
  status: ContentStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const articleSchema = new Schema<ArticleDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, required: true },
    body: { type: String, required: true },
    coverImage: { type: mediaSubSchema, required: false },
    tags: { type: [String], default: [] },
    status: { type: String, enum: CONTENT_STATUSES, default: ContentStatus.Draft, index: true },
    publishedAt: { type: Date },
  },
  baseSchemaOptions,
);

export const ArticleModel = model<ArticleDocument>('Article', articleSchema);
