import { CONTENT_STATUSES, ContentStatus, type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface SocialPostRecord {
  platform: 'linkedin' | 'facebook' | 'instagram';
  postId?: string;
  postUrl?: string;
  postedAt: Date;
  error?: string;
}

export interface ArticleDocument {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage?: MediaAsset;
  tags: string[];
  status: ContentStatus;
  publishedAt?: Date;
  autoPostToSocial: boolean;
  socialPosts: SocialPostRecord[];
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
    autoPostToSocial: { type: Boolean, default: false },
    socialPosts: {
      type: [
        {
          platform: { type: String, required: true },
          postId: { type: String },
          postUrl: { type: String },
          postedAt: { type: Date, required: true },
          error: { type: String },
        },
      ],
      default: [],
    },
  },
  baseSchemaOptions,
);

export const ArticleModel = model<ArticleDocument>('Article', articleSchema);
