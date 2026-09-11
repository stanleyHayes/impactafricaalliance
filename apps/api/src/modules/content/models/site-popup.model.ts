import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../../common/model-helpers.js';

export interface SitePopupDocument {
  name: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  delaySeconds: number;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const sitePopupSchema = new Schema<SitePopupDocument>(
  {
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    ctaLabel: { type: String },
    ctaUrl: { type: String },
    imageUrl: { type: String },
    delaySeconds: { type: Number, default: 3 },
    isActive: { type: Boolean, default: false, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    priority: { type: Number, default: 0 },
  },
  {
    ...baseSchemaOptions,
    // Pinned. Mongoose would pluralise "SitePopup" to "sitepopups", which
    // matches neither the route (/popups) nor the console's resource key, and
    // a record written to the obvious name would sit in a collection nothing
    // reads — which is exactly what happened.
    collection: 'popups',
  },
);

sitePopupSchema.index({ isActive: 1, priority: -1, updatedAt: -1 });

export const SitePopupModel = model<SitePopupDocument>('SitePopup', sitePopupSchema);
