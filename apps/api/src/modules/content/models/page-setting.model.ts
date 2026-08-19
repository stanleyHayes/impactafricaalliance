import { CONTENT_STATUSES, ContentStatus, type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface PageSettingDocument {
  pageKey: string;
  heroImage?: MediaAsset;
  seoTitle?: string;
  seoDescription?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  introEyebrow?: string;
  introTitle?: string;
  introBody?: string;
  bodyContent?: string;
  ctaTitle?: string;
  ctaBody?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  status: ContentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const pageSettingSchema = new Schema<PageSettingDocument>(
  {
    pageKey: { type: String, required: true, unique: true, index: true },
    heroImage: { type: mediaSubSchema, required: false },
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    heroEyebrow: { type: String, trim: true },
    heroTitle: { type: String, trim: true },
    heroSubtitle: { type: String, trim: true },
    introEyebrow: { type: String, trim: true },
    introTitle: { type: String, trim: true },
    introBody: { type: String, trim: true },
    bodyContent: { type: String, trim: true },
    ctaTitle: { type: String, trim: true },
    ctaBody: { type: String, trim: true },
    ctaLabel: { type: String, trim: true },
    ctaUrl: { type: String, trim: true },
    status: { type: String, enum: CONTENT_STATUSES, default: ContentStatus.Draft, index: true },
  },
  baseSchemaOptions,
);

export const PageSettingModel = model<PageSettingDocument>('PageSetting', pageSettingSchema);
