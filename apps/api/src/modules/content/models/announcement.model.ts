import { BANNER_TONES, type BannerTone } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../../common/model-helpers.js';

export interface AnnouncementDocument {
  name: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  tone: BannerTone;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<AnnouncementDocument>(
  {
    name: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    linkUrl: { type: String },
    linkLabel: { type: String },
    tone: { type: String, enum: BANNER_TONES, default: 'announcement' },
    // Off by default: a banner written now is usually meant for later, and a
    // half-drafted one appearing the moment it is saved is the wrong surprise.
    isActive: { type: Boolean, default: false, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    priority: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

// Every read is "what is live", which is this in one index.
announcementSchema.index({ isActive: 1, priority: -1, updatedAt: -1 });

export const AnnouncementModel = model<AnnouncementDocument>('Announcement', announcementSchema);
