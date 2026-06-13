import { z } from 'zod';

import { DONATION_LIMITS } from '../constants/donation.js';
import {
  DONATION_FREQUENCIES,
  DONATION_STATUSES,
  PAYMENT_PROVIDERS,
  type DonationFrequency,
  type DonationStatus,
  type PaymentProvider,
} from '../enums.js';

import type { Timestamped } from './common.js';

const providerEnum = z.enum(PAYMENT_PROVIDERS as [PaymentProvider, ...PaymentProvider[]]);
const frequencyEnum = z.enum(DONATION_FREQUENCIES as [DonationFrequency, ...DonationFrequency[]]);

/**
 * Request to start a donation. The client never sends a status or provider
 * reference — those are owned by the server and the payment provider.
 */
export const createDonationSchema = z.object({
  provider: providerEnum,
  amountUsd: z
    .number()
    .min(DONATION_LIMITS.minUsd, `Minimum donation is $${DONATION_LIMITS.minUsd}`)
    .max(DONATION_LIMITS.maxUsd, `Maximum donation is $${DONATION_LIMITS.maxUsd}`),
  frequency: frequencyEnum.default('one-time'),
  donorName: z.string().min(2).max(120).trim().optional(),
  donorEmail: z.string().email().toLowerCase().trim(),
});
export type CreateDonationInput = z.infer<typeof createDonationSchema>;

/**
 * Provider-agnostic response that tells the client how to complete payment.
 * - Stripe: `clientSecret` for the Payment Element.
 * - Paystack: `authorizationUrl` to redirect to, plus `reference`.
 */
export interface DonationInitResponse {
  donationId: string;
  provider: PaymentProvider;
  reference: string;
  clientSecret?: string;
  authorizationUrl?: string;
  publicKey?: string;
}

export interface Donation extends Timestamped {
  provider: PaymentProvider;
  reference: string;
  amountUsd: number;
  frequency: DonationFrequency;
  status: DonationStatus;
  donorName?: string;
  donorEmail: string;
}

export { DONATION_STATUSES };
