import type { MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface PartnerDocument {
  name: string;
  logo: MediaAsset;
  websiteUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const partnerSchema = new Schema<PartnerDocument>(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: mediaSubSchema, required: true },
    websiteUrl: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const PartnerModel = model<PartnerDocument>('Partner', partnerSchema);
