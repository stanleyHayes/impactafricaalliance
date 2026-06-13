import { randomUUID } from 'node:crypto';

import {
  DonationStatus,
  PaymentProvider,
  type CreateDonationInput,
  type DonationInitResponse,
  type Paginated,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError, ValidationError } from '../../common/errors.js';
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
    });

    if (input.provider === PaymentProvider.Stripe) {
      return this.startStripe(donation.id, input);
    }
    return this.startPaystack(donation.id, donation.reference, input);
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    if (!signature) {
      throw new ValidationError('Missing Stripe signature header');
    }
    const event = await this.stripe.constructEvent(rawBody, signature);
    const reference = (event.data.object as { id?: string }).id;
    if (!reference) {
      return;
    }
    if (event.type === 'payment_intent.succeeded') {
      await this.markStatus(reference, DonationStatus.Succeeded);
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.markStatus(reference, DonationStatus.Failed);
    }
  }

  async handlePaystackWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    if (!this.paystack.verifyWebhookSignature(rawBody, signature)) {
      throw new ValidationError('Invalid Paystack signature');
    }
    const event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEvent;
    if (event.event === 'charge.success') {
      await this.markStatus(event.data.reference, DonationStatus.Succeeded);
    } else if (event.event === 'charge.failed') {
      await this.markStatus(event.data.reference, DonationStatus.Failed);
    }
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
