import type { MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface SiteImageDocument {
  key: string;
  image: MediaAsset;
  /**
   * Absent once an editor clears it (older records may hold null), so the
   * picture's own description is used again.
   */
  alt?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const siteImageSchema = new Schema<SiteImageDocument>(
  {
    // One image per slot; uploading again replaces rather than accumulates.
    // The key is checked against the shared slot catalogue on the way in.
    key: { type: String, required: true, unique: true, trim: true, index: true },
    image: { type: mediaSubSchema, required: true },
    alt: { type: String },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const SiteImageModel = model<SiteImageDocument>('SiteImage', siteImageSchema);
