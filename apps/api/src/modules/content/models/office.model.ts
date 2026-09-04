import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../../common/model-helpers.js';

export interface OfficeDocument {
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
  mapUrl?: string;
  isPrimary: boolean;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const officeSchema = new Schema<OfficeDocument>(
  {
    label: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String },
    city: { type: String },
    region: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true, trim: true },
    phone: { type: String },
    email: { type: String },
    mapUrl: { type: String },
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

export const OfficeModel = model<OfficeDocument>('Office', officeSchema);
