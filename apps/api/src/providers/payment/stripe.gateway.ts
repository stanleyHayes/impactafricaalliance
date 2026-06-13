import type Stripe from 'stripe';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError, ValidationError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

export interface StripeIntent {
  reference: string;
  clientSecret: string;
}

/** Thin wrapper over the Stripe SDK for one-off donation PaymentIntents. */
@injectable()
export class StripeGateway {
  private client?: Stripe;

  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.stripe.secretKey);
  }

  async createIntent(
    amountUsdCents: number,
    donorEmail: string,
    donationId: string,
  ): Promise<StripeIntent> {
    const client = await this.getClient();
    const intent = await client.paymentIntents.create({
      amount: amountUsdCents,
      currency: 'usd',
      receipt_email: donorEmail,
      metadata: { donationId },
      automatic_payment_methods: { enabled: true },
    });
    if (!intent.client_secret) {
      throw new ServiceUnavailableError('Stripe did not return a client secret');
    }
    return { reference: intent.id, clientSecret: intent.client_secret };
  }

  async constructEvent(rawBody: Buffer, signature: string): Promise<Stripe.Event> {
    const client = await this.getClient();
    const secret = this.config.stripe.webhookSecret;
    if (!secret) {
      throw new ServiceUnavailableError('Stripe webhook secret is not configured');
    }
    try {
      return client.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new ValidationError('Invalid Stripe webhook signature');
    }
  }

  private async getClient(): Promise<Stripe> {
    const secretKey = this.config.stripe.secretKey;
    if (!secretKey) {
      throw new ServiceUnavailableError('Stripe is not configured');
    }
    if (!this.client) {
      const { default: StripeSdk } = await import('stripe');
      this.client = new StripeSdk(secretKey);
    }
    return this.client;
  }
}
