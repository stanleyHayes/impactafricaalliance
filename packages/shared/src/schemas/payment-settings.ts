import { z } from 'zod';

import type { DonationCurrency } from '../enums.js';

/**
 * Runtime status of a payment provider, combining environment configuration
 * (API keys present) with the admin-controlled enable/disable toggle.
 */
export interface PaymentProviderStatus {
  /** Secret API key is present in the API environment. */
  configured: boolean;
  /**
   * Webhooks can be verified. Stripe needs its own signing secret; Paystack
   * signs with the secret key, so for Paystack this matches `configured`.
   */
  webhookConfigured: boolean;
  /** Admin toggle — the provider can only be switched on when configured. */
  enabled: boolean;
  /** Effective state: donations can actually be initiated (configured && enabled). */
  accepting: boolean;
  /** The currency the provider charges in. */
  currency: DonationCurrency;
  /**
   * Paystack only: where its checkout sends donors back, built from the API's
   * PUBLIC_SITE_URL. Every payment carries it, so the Paystack dashboard's own
   * Callback URL (shared with other apps) is never used.
   */
  returnUrl?: string;
}

export interface PaymentSettingsStatus {
  stripe: PaymentProviderStatus;
  paystack: PaymentProviderStatus;
}

export const updatePaymentSettingsSchema = z
  .object({
    stripeEnabled: z.boolean().optional(),
    paystackEnabled: z.boolean().optional(),
  })
  .refine((value) => value.stripeEnabled !== undefined || value.paystackEnabled !== undefined, {
    message: 'At least one provider toggle must be provided',
  });
export type UpdatePaymentSettingsInput = z.infer<typeof updatePaymentSettingsSchema>;

/** Public, unauthenticated view of which providers currently accept donations. */
export interface PaymentProvidersPublic {
  stripe: boolean;
  paystack: boolean;
  /** What each provider charges in, so the form offers amounts in the right currency. */
  currencies: { stripe: DonationCurrency; paystack: DonationCurrency };
}
