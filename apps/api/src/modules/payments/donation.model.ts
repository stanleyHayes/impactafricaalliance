import {
  DONATION_CURRENCIES,
  DONATION_FREQUENCIES,
  DONATION_STATUSES,
  DonationCurrency,
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
  /** Major units of `currency` (GH₵100 is 100). Absent on records saved before currencies. */
  amount?: number;
  /** Absent on records saved before currencies; those were all dollars. */
  currency?: DonationCurrency;
  /** Legacy: the only amount on records saved before currencies, always in dollars. */
  amountUsd?: number;
  frequency: DonationFrequency;
  status: DonationStatus;
  donorName?: string;
  donorEmail: string;
  marketingConsent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const donationSchema = new Schema<DonationDocument>(
  {
    provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
    reference: { type: String, required: true, unique: true, index: true },
    // Required for new records only: Mongoose does not re-validate stored ones on read
    // or on the status updates, so the older records without them keep working.
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: DONATION_CURRENCIES, required: true },
    amountUsd: { type: Number, min: 0 },
    frequency: { type: String, enum: DONATION_FREQUENCIES, default: DonationFrequency.OneTime },
    status: { type: String, enum: DONATION_STATUSES, default: DonationStatus.Pending, index: true },
    donorName: { type: String },
    donorEmail: { type: String, required: true, lowercase: true, trim: true },
    marketingConsent: { type: Boolean },
  },
  baseSchemaOptions,
);

export const DonationModel = model<DonationDocument>('Donation', donationSchema);

/** A donation's amount, reading a record saved before currencies by its dollar amount. */
export const donationAmountOf = (
  donation: Pick<DonationDocument, 'amount' | 'amountUsd'>,
): number => donation.amount ?? donation.amountUsd ?? 0;

/** A donation's currency; records saved before currencies were all dollars. */
export const donationCurrencyOf = (
  donation: Pick<DonationDocument, 'currency'>,
): DonationCurrency => donation.currency ?? DonationCurrency.USD;

/**
 * The same two readings for an aggregation pipeline, so a total or a chart counts an
 * old record exactly as a list shows it.
 */
export const DONATION_AMOUNT_EXPR = { $ifNull: ['$amount', { $ifNull: ['$amountUsd', 0] }] };
export const DONATION_CURRENCY_EXPR = { $ifNull: ['$currency', DonationCurrency.USD] };
