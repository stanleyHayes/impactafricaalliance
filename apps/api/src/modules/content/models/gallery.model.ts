import { CONTENT_STATUSES, ContentStatus, type MediaAsset } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../../common/model-helpers.js';

export interface GalleryItemDocument {
  title: string;
  programme: string;
  caption?: string;
  location?: string;
  image: MediaAsset;
  capturedOn?: Date;
  featured: boolean;
  status: ContentStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const gallerySchema = new Schema<GalleryItemDocument>(
  {
    title: { type: String, required: true, trim: true },
    programme: { type: String, required: true, trim: true, index: true },
    caption: { type: String, trim: true },
    location: { type: String, trim: true },
    image: { type: mediaSubSchema, required: true },
    capturedOn: { type: Date },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: CONTENT_STATUSES, default: ContentStatus.Draft, index: true },
    order: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

export const GalleryItemModel = model<GalleryItemDocument>('GalleryItem', gallerySchema);
