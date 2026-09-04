import type { SiteSettingAnnouncement, SiteSettingSocials } from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface SiteSettingDocument {
  key: 'site';
  siteName: string;
  tagline?: string;
  contactEmail: string;
  contactPhone: string;
  whatsappPhone?: string;
  alternatePhone?: string;
  alternatePhoneLabel?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
  regionalPresence?: string[];
  mapUrl?: string;
  socials?: SiteSettingSocials;
  announcement?: SiteSettingAnnouncement;
  createdAt: Date;
  updatedAt: Date;
}

const socialsSubSchema = new Schema<SiteSettingSocials>(
  {
    facebook: { type: String },
    x: { type: String },
    instagram: { type: String },
    linkedin: { type: String },
    youtube: { type: String },
    tiktok: { type: String },
  },
  { _id: false },
);

const announcementSubSchema = new Schema<SiteSettingAnnouncement>(
  {
    enabled: { type: Boolean, default: false },
    message: { type: String },
    linkUrl: { type: String },
    linkLabel: { type: String },
  },
  { _id: false },
);

const siteSettingSchema = new Schema<SiteSettingDocument>(
  {
    key: { type: String, required: true, unique: true, index: true, default: 'site' },
    siteName: { type: String, required: true },
    tagline: { type: String },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },
    whatsappPhone: { type: String },
    alternatePhone: { type: String },
    alternatePhoneLabel: { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    region: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true },
    regionalPresence: { type: [String], default: undefined },
    mapUrl: { type: String },
    socials: { type: socialsSubSchema, required: false },
    announcement: { type: announcementSubSchema, required: false },
  },
  baseSchemaOptions,
);

export const SiteSettingModel = model<SiteSettingDocument>('SiteSetting', siteSettingSchema);
