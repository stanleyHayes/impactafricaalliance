import {
  PaymentProvider,
  type PaymentProvidersPublic,
  type PaymentProviderStatus,
  type PaymentSettingsStatus,
  type UpdatePaymentSettingsInput,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { ValidationError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

import { PaymentSettingModel, type PaymentSettingDocument } from './payment-setting.model.js';

const DEFAULTS: Pick<PaymentSettingDocument, 'stripeEnabled' | 'paystackEnabled'> = {
  stripeEnabled: false,
  paystackEnabled: false,
};

/**
 * Owns the admin-controlled payment provider toggles. Environment keys decide
 * whether a provider *can* run; these settings decide whether it *should*.
 * Both must be true for donations to be initiated.
 */
@injectable()
export class PaymentSettingsService {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  private async current(): Promise<Pick<PaymentSettingDocument, 'stripeEnabled' | 'paystackEnabled'>> {
    const doc = await PaymentSettingModel.findOne({ key: 'payments' }).exec();
    return doc ?? DEFAULTS;
  }

  private providerStatus(configured: boolean, webhookConfigured: boolean, enabled: boolean): PaymentProviderStatus {
    return { configured, webhookConfigured, enabled, accepting: configured && enabled };
  }

  async getStatus(): Promise<PaymentSettingsStatus> {
    const settings = await this.current();
    const stripeConfigured = Boolean(this.config.stripe.secretKey);
    const paystackConfigured = Boolean(this.config.paystack.secretKey);
    return {
      stripe: this.providerStatus(
        stripeConfigured,
        Boolean(this.config.stripe.webhookSecret),
        settings.stripeEnabled && stripeConfigured,
      ),
      paystack: this.providerStatus(
        paystackConfigured,
        Boolean(this.config.paystack.webhookSecret),
        settings.paystackEnabled && paystackConfigured,
      ),
    };
  }

  /** Public, unauthenticated view of which providers can take a donation right now. */
  async getPublicProviders(): Promise<PaymentProvidersPublic> {
    const status = await this.getStatus();
    return { stripe: status.stripe.accepting, paystack: status.paystack.accepting };
  }

  async isAccepting(provider: PaymentProvider): Promise<boolean> {
    const status = await this.getStatus();
    return provider === PaymentProvider.Stripe ? status.stripe.accepting : status.paystack.accepting;
  }

  async update(input: UpdatePaymentSettingsInput): Promise<PaymentSettingsStatus> {
    // Refuse to enable a provider whose API keys are not configured — the toggle
    // would be a no-op at best and a false sense of readiness at worst.
    if (input.stripeEnabled && !this.config.stripe.secretKey) {
      throw new ValidationError('Stripe cannot be enabled until STRIPE_SECRET_KEY is configured');
    }
    if (input.paystackEnabled && !this.config.paystack.secretKey) {
      throw new ValidationError('Paystack cannot be enabled until PAYSTACK_SECRET_KEY is configured');
    }

    const updates: Partial<PaymentSettingDocument> = {};
    if (input.stripeEnabled !== undefined) {
      updates.stripeEnabled = input.stripeEnabled;
    }
    if (input.paystackEnabled !== undefined) {
      updates.paystackEnabled = input.paystackEnabled;
    }

    await PaymentSettingModel.findOneAndUpdate(
      { key: 'payments' },
      { $set: updates },
      { upsert: true, setDefaultsOnInsert: true },
    ).exec();

    return this.getStatus();
  }
}
