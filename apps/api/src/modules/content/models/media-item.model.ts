import { MEDIA_FOLDERS, type MediaFolder } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../../common/model-helpers.js';

export interface MediaItemDocument {
  url: string;
  publicId: string;
  filename: string;
  folder: MediaFolder;
  altText?: string;
  tags: string[];
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  createdAt: Date;
  updatedAt: Date;
}

const mediaItemSchema = new Schema<MediaItemDocument>(
  {
    url: { type: String, required: true },
    // Cloudinary's own id. Unique, so re-registering the same upload updates
    // the catalogue entry rather than creating a duplicate tile.
    publicId: { type: String, required: true, unique: true, index: true },
    filename: { type: String, required: true, trim: true },
    folder: { type: String, enum: MEDIA_FOLDERS, default: 'site', index: true },
    altText: { type: String },
    tags: { type: [String], default: [], index: true },
    width: { type: Number },
    height: { type: Number },
    bytes: { type: Number },
    format: { type: String },
  },
  baseSchemaOptions,
);

export const MediaItemModel = model<MediaItemDocument>('MediaItem', mediaItemSchema);
