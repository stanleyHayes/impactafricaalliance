import { randomUUID } from 'node:crypto';

import {
  DonationStatus,
  PaymentProvider,
  type CreateDonationInput,
  type DonationInitResponse,
  type Paginated,
} from '@iaa/shared';
import type Stripe from 'stripe';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError, WebhookSignatureError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { AppLogger } from '../../config/logger.js';
import { PaystackGateway } from '../../providers/payment/paystack.gateway.js';
import { StripeGateway } from '../../providers/payment/stripe.gateway.js';
import { TOKENS } from '../../tokens.js';

import type { DonationDocument } from './donation.model.js';
import { DonationRepository } from './donation.repository.js';

const toMinorUnits = (amountUsd: number): number => Math.round(amountUsd * 100);

interface PaystackWebhookEvent {
  event: string;
  data: { reference: string };
}

@injectable()
export class PaymentService {
  constructor(
    @inject(DonationRepository) private readonly donations: DonationRepository,
    @inject(StripeGateway) private readonly stripe: StripeGateway,
    @inject(PaystackGateway) private readonly paystack: PaystackGateway,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async createDonation(input: CreateDonationInput): Promise<DonationInitResponse> {
    const donation = await this.donations.create({
      provider: input.provider,
      reference: randomUUID(),
      amountUsd: input.amountUsd,
      frequency: input.frequency,
      donorEmail: input.donorEmail,
      ...(input.donorName ? { donorName: input.donorName } : {}),
      ...(input.marketingConsent !== undefined ? { marketingConsent: input.marketingConsent } : {}),
    });

    try {
      if (input.provider === PaymentProvider.Stripe) {
        return await this.startStripe(donation.id, input);
      }
      return await this.startPaystack(donation.id, donation.reference, input);
    } catch (error) {
      // Don't leave orphaned pending records if the gateway fails to initialise.
      await this.donations.delete(donation.id);
      throw error;
    }
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    if (!this.stripe.isConfigured()) {
      throw new ServiceUnavailableError('Stripe is not configured');
    }
    if (!signature) {
      throw new WebhookSignatureError('Missing Stripe signature header');
    }
    const event = await this.stripe.constructEvent(rawBody, signature);
    const intent = event.data.object as Stripe.PaymentIntent;
    const reference = intent.id;
    if (!reference) {
      return;
    }
    if (event.type === 'payment_intent.succeeded') {
      // The amount is fixed server-side at PaymentIntent creation; still reconcile the
      // gateway-confirmed amount/currency/status before recording a successful donation.
      await this.confirmSuccess(reference, {
        gatewaySucceeded: intent.status === 'succeeded',
        chargedMinorUnits: intent.amount_received || intent.amount,
        currency: intent.currency,
      });
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.markStatus(reference, DonationStatus.Failed);
    }
  }

  async handlePaystackWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    if (!this.paystack.isConfigured()) {
      throw new ServiceUnavailableError('Paystack is not configured');
    }
    this.paystack.verifyWebhookSignature(rawBody, signature);
    const event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEvent;
    const reference = event.data.reference;
    if (!reference) {
      return;
    }
    if (event.event === 'charge.success') {
      // Never trust the webhook payload's amount: re-verify server-to-server with Paystack
      // and reconcile the authoritative charged amount/currency before marking succeeded.
      const verified = await this.paystack.verify(reference);
      await this.confirmSuccess(reference, {
        gatewaySucceeded: verified.status === 'success',
        chargedMinorUnits: verified.amountUsdCents,
        currency: verified.currency,
      });
    } else if (event.event === 'charge.failed') {
      await this.markStatus(reference, DonationStatus.Failed);
    }
  }

  /**
   * Mark a donation `Succeeded` only after confirming, against the gateway's own record, that
   * the transaction actually succeeded for the exact amount and currency we recorded. This
   * closes the gap where a signed "success" event was trusted to imply the stored amount was
   * paid, letting an attacker fund a far smaller charge against the same reference.
   */
  private async confirmSuccess(
    reference: string,
    gateway: { gatewaySucceeded: boolean; chargedMinorUnits: number; currency: string },
  ): Promise<void> {
    const donation = await this.donations.findByReference(reference);
    if (!donation) {
      this.logger.warn({ reference }, 'Donation webhook for unknown reference; ignoring');
      return;
    }
    if (!gateway.gatewaySucceeded) {
      this.logger.warn({ reference }, 'Gateway did not confirm success; not marking succeeded');
      return;
    }
    const expectedMinorUnits = toMinorUnits(donation.amountUsd);
    if (gateway.currency.toLowerCase() !== 'usd' || gateway.chargedMinorUnits !== expectedMinorUnits) {
      this.logger.warn(
        {
          reference,
          expectedMinorUnits,
          chargedMinorUnits: gateway.chargedMinorUnits,
          currency: gateway.currency,
        },
        'Donation amount/currency mismatch; refusing to mark succeeded',
      );
      return;
    }
    await this.markStatus(reference, DonationStatus.Succeeded);
  }

  async list(page: number, pageSize: number): Promise<Paginated<DonationDocument>> {
    const { items, total } = await this.donations.list(page, pageSize);
    return paginate(items, total, page, pageSize);
  }

  private async startStripe(
    donationId: string,
    input: CreateDonationInput,
  ): Promise<DonationInitResponse> {
    if (!this.stripe.isConfigured()) {
      throw new ServiceUnavailableError('Stripe is not configured');
    }
    const intent = await this.stripe.createIntent(
      toMinorUnits(input.amountUsd),
      input.donorEmail,
      donationId,
    );
    await this.donations.setReference(donationId, intent.reference);
    return {
      donationId,
      provider: PaymentProvider.Stripe,
      reference: intent.reference,
      clientSecret: intent.clientSecret,
    };
  }

  private async startPaystack(
    donationId: string,
    reference: string,
    input: CreateDonationInput,
  ): Promise<DonationInitResponse> {
    if (!this.paystack.isConfigured()) {
      throw new ServiceUnavailableError('Paystack is not configured');
    }
    const init = await this.paystack.initialize(
      toMinorUnits(input.amountUsd),
      input.donorEmail,
      reference,
    );
    return {
      donationId,
      provider: PaymentProvider.Paystack,
      reference: init.reference,
      authorizationUrl: init.authorizationUrl,
    };
  }

  private async markStatus(reference: string, status: DonationStatus): Promise<void> {
    const updated = await this.donations.setStatus(reference, status);
    if (updated) {
      this.logger.info({ reference, status }, 'Donation status updated');
    }
  }
}
