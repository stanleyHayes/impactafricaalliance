import { randomUUID } from 'node:crypto';

import {
  DonationStatus,
  PaymentProvider,
  toMinorUnits,
  type CreateDonationInput,
  type Donation,
  type DonationConfirmation,
  type DonationCurrency,
  type DonationInitResponse,
  type Paginated,
} from '@iaa/shared';
import type { HydratedDocument } from 'mongoose';
import type Stripe from 'stripe';
import { inject, injectable } from 'tsyringe';

import {
  ServiceUnavailableError,
  ValidationError,
  WebhookSignatureError,
} from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { AppLogger } from '../../config/logger.js';
import { PaystackGateway } from '../../providers/payment/paystack.gateway.js';
import { StripeGateway } from '../../providers/payment/stripe.gateway.js';
import { TOKENS } from '../../tokens.js';

import { donationAmountOf, donationCurrencyOf, type DonationDocument } from './donation.model.js';
import { DonationRepository } from './donation.repository.js';

interface PaystackWebhookEvent {
  event?: string;
  data?: { reference?: string };
}

const PROVIDER_NAMES: Record<PaymentProvider, string> = {
  [PaymentProvider.Stripe]: 'Stripe',
  [PaymentProvider.Paystack]: 'Paystack',
};

/** The wire shape of a stored donation, with an older dollars-only record read as dollars. */
const toDonation = (doc: HydratedDocument<DonationDocument>): Donation => {
  const json = doc.toJSON() as unknown as Donation & { amountUsd?: number };
  // Its dollars are now `amount` with `currency: 'USD'`; one figure per gift, not two.
  delete json.amountUsd;
  return { ...json, amount: donationAmountOf(doc), currency: donationCurrencyOf(doc) };
};

@injectable()
export class PaymentService {
  constructor(
    @inject(DonationRepository) private readonly donations: DonationRepository,
    @inject(StripeGateway) private readonly stripe: StripeGateway,
    @inject(PaystackGateway) private readonly paystack: PaystackGateway,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /** What a provider charges in: dollars for Stripe, PAYSTACK_CURRENCY for Paystack. */
  currencyFor(provider: PaymentProvider): DonationCurrency {
    return provider === PaymentProvider.Stripe ? this.stripe.currency : this.paystack.currency;
  }

  async createDonation(input: CreateDonationInput): Promise<DonationInitResponse> {
    const currency = this.currencyFor(input.provider);
    // The amount was chosen in the currency the form showed; charging it in another
    // would take a very different sum, so a stale page is refused rather than converted.
    if (input.currency !== currency) {
      throw new ValidationError(
        `${PROVIDER_NAMES[input.provider]} donations are made in ${currency}, not ${input.currency}`,
        { currency },
      );
    }

    const donation = await this.donations.create({
      provider: input.provider,
      reference: randomUUID(),
      amount: input.amount,
      currency,
      frequency: input.frequency,
      donorEmail: input.donorEmail,
      marketingConsent: input.marketingConsent,
      ...(input.donorName ? { donorName: input.donorName } : {}),
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
    const reference = event.data?.reference;
    if (!reference) {
      return;
    }
    if (event.event === 'charge.success') {
      // Never trust the webhook payload's amount: re-verify server-to-server with Paystack
      // and reconcile the authoritative charged amount/currency before marking succeeded.
      const verified = await this.paystack.verify(reference);
      await this.confirmSuccess(reference, {
        gatewaySucceeded: verified.status === 'success',
        chargedMinorUnits: verified.amountMinor,
        requestedMinorUnits: verified.requestedMinor,
        currency: verified.currency,
      });
    } else if (event.event === 'charge.failed') {
      await this.markStatus(reference, DonationStatus.Failed);
    }
  }

  /**
   * Server-to-server verification for the browser return after Paystack checkout. The webhook
   * remains the source of truth, but donors land back on the site before it arrives, so we
   * verify directly with Paystack and reconcile through the same `confirmSuccess` path.
   */
  async confirmPaystackReturn(reference: string): Promise<DonationConfirmation> {
    if (!this.paystack.isConfigured()) {
      throw new ServiceUnavailableError('Paystack is not configured');
    }
    const verified = await this.paystack.verify(reference);
    if (verified.status === 'success') {
      await this.confirmSuccess(reference, {
        gatewaySucceeded: true,
        chargedMinorUnits: verified.amountMinor,
        requestedMinorUnits: verified.requestedMinor,
        currency: verified.currency,
      });
    } else if (verified.status === 'failed' || verified.status === 'abandoned') {
      // 'abandoned' is not final on Paystack's side: a mobile-money approval can land after the
      // donor is back. Should it, the verified charge.success lifts the gift out of Failed.
      await this.markStatus(reference, DonationStatus.Failed);
    }
    const donation = await this.donations.findByReference(reference);
    if (!donation) {
      return { status: DonationStatus.Pending };
    }
    return {
      status: donation.status,
      amount: donationAmountOf(donation),
      currency: donationCurrencyOf(donation),
    };
  }

  /**
   * Mark a donation `Succeeded` only after confirming, against the gateway's own record, that
   * the transaction actually succeeded for the amount and currency we recorded. This closes
   * the gap where a signed "success" event was trusted to imply the stored amount was paid,
   * letting an attacker fund a far smaller charge against the same reference.
   *
   * When Paystack passes its fee on to the donor, the charge is the gift plus the fee, and
   * the gift itself is in `requestedMinorUnits`: that must match exactly, and the charge may
   * not fall short of it. A gateway that reports no requested amount must charge it exactly.
   */
  private async confirmSuccess(
    reference: string,
    gateway: {
      gatewaySucceeded: boolean;
      chargedMinorUnits: number;
      requestedMinorUnits?: number;
      currency: string;
    },
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
    const expectedCurrency = donationCurrencyOf(donation);
    const expectedMinorUnits = toMinorUnits(donationAmountOf(donation));
    const requestedMinorUnits = gateway.requestedMinorUnits ?? gateway.chargedMinorUnits;
    if (
      gateway.currency.toUpperCase() !== expectedCurrency ||
      requestedMinorUnits !== expectedMinorUnits ||
      gateway.chargedMinorUnits < expectedMinorUnits
    ) {
      this.logger.warn(
        {
          reference,
          expectedCurrency,
          expectedMinorUnits,
          requestedMinorUnits,
          chargedMinorUnits: gateway.chargedMinorUnits,
          currency: gateway.currency,
        },
        'Donation amount/currency mismatch; refusing to mark succeeded',
      );
      return;
    }
    // A verified success also lifts a gift out of Failed: a declined first try, or a checkout
    // seen as abandoned that was completed afterwards, is still a gift that arrived.
    const updated = await this.donations.markSucceeded(reference);
    if (updated) {
      this.logger.info({ reference, status: DonationStatus.Succeeded }, 'Donation status updated');
    }
  }

  async list(page: number, pageSize: number): Promise<Paginated<Donation>> {
    const { items, total } = await this.donations.list(page, pageSize);
    return paginate(items.map(toDonation), total, page, pageSize);
  }

  private async startStripe(
    donationId: string,
    input: CreateDonationInput,
  ): Promise<DonationInitResponse> {
    if (!this.stripe.isConfigured()) {
      throw new ServiceUnavailableError('Stripe is not configured');
    }
    const intent = await this.stripe.createIntent(
      toMinorUnits(input.amount),
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
    const init = await this.paystack.initialize({
      amountMinor: toMinorUnits(input.amount),
      email: input.donorEmail,
      reference,
    });
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
