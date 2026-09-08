import { DEVICE_KINDS, type DeviceKind } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface PageViewDocument {
  id: string;
  path: string;
  referrerHost?: string;
  /** ISO-3166 alpha-2, from the edge. Absent when the request did not come through it. */
  country?: string;
  region?: string;
  city?: string;
  device: DeviceKind;
  browser?: string;
  os?: string;
  /**
   * A salted digest of address, agent and calendar day. It counts one person
   * once within a day and cannot be matched to them, or to the same person on
   * a different day. The address itself is never written down.
   */
  visitorHash: string;
  occurredAt: Date;
  /** Hour of the day in UTC, kept alongside the timestamp for the hourly chart. */
  hourUtc: number;
  createdAt: Date;
  updatedAt: Date;
}

const pageViewSchema = new Schema<PageViewDocument>(
  {
    path: { type: String, required: true, trim: true, index: true },
    referrerHost: { type: String, required: false, trim: true },
    country: { type: String, required: false, uppercase: true, trim: true, index: true },
    region: { type: String, required: false, trim: true },
    city: { type: String, required: false, trim: true },
    device: { type: String, enum: DEVICE_KINDS, required: true },
    browser: { type: String, required: false, trim: true },
    os: { type: String, required: false, trim: true },
    visitorHash: { type: String, required: true, index: true },
    occurredAt: { type: Date, required: true, index: true },
    hourUtc: { type: Number, required: true, min: 0, max: 23 },
  },
  baseSchemaOptions,
);

// Every query is "this window, grouped by something", so the window leads.
pageViewSchema.index({ occurredAt: -1, country: 1 });
pageViewSchema.index({ occurredAt: -1, path: 1 });

/**
 * Thirteen months, which covers a full year plus the month you are comparing
 * against. Traffic rows are cheap individually and endless collectively, and
 * this database is not sized for keeping every visit forever.
 */
pageViewSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });

export const PageViewModel = model<PageViewDocument>('PageView', pageViewSchema);
