import type { MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface PillarImageDocument {
  pillarKey: string;
  image: MediaAsset;
  alt?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pillarImageSchema = new Schema<PillarImageDocument>(
  {
    // One image per pillar; re-uploading replaces rather than accumulates.
    pillarKey: { type: String, required: true, unique: true, trim: true, index: true },
    image: { type: mediaSubSchema, required: true },
    alt: { type: String },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const PillarImageModel = model<PillarImageDocument>('PillarImage', pillarImageSchema);
