import type { MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface SiteImageDocument {
  key: string;
  image: MediaAsset;
  alt?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const siteImageSchema = new Schema<SiteImageDocument>(
  {
    // One image per slot; uploading again replaces rather than accumulates.
    key: { type: String, required: true, unique: true, trim: true, index: true },
    image: { type: mediaSubSchema, required: true },
    alt: { type: String },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const SiteImageModel = model<SiteImageDocument>('SiteImage', siteImageSchema);
