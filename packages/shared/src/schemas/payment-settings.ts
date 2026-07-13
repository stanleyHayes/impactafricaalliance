import { z } from 'zod';

/**
 * Runtime status of a payment provider, combining environment configuration
 * (API keys present) with the admin-controlled enable/disable toggle.
 */
export interface PaymentProviderStatus {
  /** Secret API key is present in the API environment. */
  configured: boolean;
  /** Webhook signing secret is present in the API environment. */
  webhookConfigured: boolean;
  /** Admin toggle — the provider can only be switched on when configured. */
  enabled: boolean;
  /** Effective state: donations can actually be initiated (configured && enabled). */
  accepting: boolean;
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
}
