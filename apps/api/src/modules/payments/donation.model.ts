import {
  DONATION_FREQUENCIES,
  DONATION_STATUSES,
  DonationFrequency,
  DonationStatus,
  PAYMENT_PROVIDERS,
  type PaymentProvider,
} from '@iaa/shared';
import { Schema, model } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';

export interface DonationDocument {
  provider: PaymentProvider;
  reference: string;
  amountUsd: number;
  frequency: DonationFrequency;
  status: DonationStatus;
  donorName?: string;
  donorEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

const donationSchema = new Schema<DonationDocument>(
  {
    provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
    reference: { type: String, required: true, unique: true, index: true },
    amountUsd: { type: Number, required: true, min: 0 },
    frequency: { type: String, enum: DONATION_FREQUENCIES, default: DonationFrequency.OneTime },
    status: { type: String, enum: DONATION_STATUSES, default: DonationStatus.Pending, index: true },
    donorName: { type: String },
    donorEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  baseSchemaOptions,
);

export const DonationModel = model<DonationDocument>('Donation', donationSchema);
