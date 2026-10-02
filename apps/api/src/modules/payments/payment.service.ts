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
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
  WebhookSignatureError,
} from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { AppLogger } from '../../config/logger.js';
import {
  PAYSTACK_SOURCE,
  PaystackGateway,
  isPaystackReference,
  newPaystackReference,
  type PaystackVerification,
} from '../../providers/payment/paystack.gateway.js';
import { StripeGateway } from '../../providers/payment/stripe.gateway.js';
import { TOKENS } from '../../tokens.js';

import { donationAmountOf, donationCurrencyOf, type DonationDocument } from './donation.model.js';
import { DonationRepository } from './donation.repository.js';

/** A webhook's body as signed: any JSON at all, whatever Paystack documents. */
interface PaystackWebhookEvent {
  event?: unknown;
  data?: { reference?: unknown };
}

/** What a gateway reports it took for a payment. */
interface GatewayCharge {
  /** What the donor paid, in minor units: with Paystack's fee when the donor bears it. */
  chargedMinorUnits: number;
  /** What the payment asked for, before any fee; a gateway without it charged exactly this. */
  requestedMinorUnits?: number;
  currency: string;
}

/** What one look at Paystack made of a gift: paid, failed, or not paid (yet). */
type PaystackCheck = 'succeeded' | 'failed' | 'unpaid';

const PROVIDER_NAMES: Record<PaymentProvider, string> = {
  [PaymentProvider.Stripe]: 'Stripe',
  [PaymentProvider.Paystack]: 'Paystack',
};

/** The webhook events about a payment's outcome; every other kind is acknowledged and ignored. */
const PAYSTACK_CHARGE_EVENTS = new Set(['charge.success', 'charge.failed']);

/** The wire shape of a stored donation, with an older dollars-only record read as dollars. */
const toDonation = (doc: HydratedDocument<DonationDocument>): Donation => {
  const json = doc.toJSON() as unknown as Donation & { amountUsd?: number };
  // Its dollars are now `amount` with `currency: 'USD'`; one figure per gift, not two.
  delete json.amountUsd;
  return { ...json, amount: donationAmountOf(doc), currency: donationCurrencyOf(doc) };
};

/**
 * Why a charge did not pay for this gift, in a few words for the log; nothing when it did. It
 * must be in the gift's currency, and for the gift itself. When Paystack passes its fee on to
 * the donor, the charge is the gift plus the fee and the gift is in `requestedMinorUnits`: that
 * must match exactly, and the charge may not fall short of it. A gateway that reports no
 * requested amount must charge the gift exactly.
 */
const chargeMismatch = (
  donation: Pick<DonationDocument, 'amount' | 'amountUsd' | 'currency'>,
  charge: GatewayCharge,
): string | undefined => {
  const expectedMinorUnits = toMinorUnits(donationAmountOf(donation));
  if (charge.currency.toUpperCase() !== donationCurrencyOf(donation)) {
    return 'another currency';
  }
  if ((charge.requestedMinorUnits ?? charge.chargedMinorUnits) !== expectedMinorUnits) {
    return 'another amount';
  }
  return charge.chargedMinorUnits < expectedMinorUnits ? 'charged less than the gift' : undefined;
};

/**
 * Why Paystack's record cannot count for this gift; nothing when it can. The account is shared
 * with other apps, so the record must be for this reference and, when its metadata names who
 * started it, name this site. A success must also have paid for the gift.
 */
const paystackMismatch = (
  donation: Pick<DonationDocument, 'reference' | 'amount' | 'amountUsd' | 'currency'>,
  verified: PaystackVerification,
): string | undefined => {
  if (verified.reference !== donation.reference) {
    return 'another reference';
  }
  if (verified.source !== undefined && verified.source !== PAYSTACK_SOURCE) {
    return 'another source';
  }
  if (verified.status !== 'success') {
    return undefined;
  }
  return chargeMismatch(donation, {
    chargedMinorUnits: verified.amountMinor,
    requestedMinorUnits: verified.requestedMinor,
    currency: verified.currency,
  });
};

/** The reference a charge event is about; nothing for another kind of event, or no event. */
const chargeReferenceOf = (rawBody: Buffer): string | undefined => {
  let event: PaystackWebhookEvent | null;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEvent | null;
  } catch {
    return undefined;
  }
  const type = event?.event;
  const reference = event?.data?.reference;
  return typeof type === 'string' &&
    PAYSTACK_CHARGE_EVENTS.has(type) &&
    typeof reference === 'string'
    ? reference
    : undefined;
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
      // Paystack keeps this `iaa-` reference; Stripe swaps it for its PaymentIntent's id.
      reference: newPaystackReference(),
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

  /**
   * A webhook is welcome but never relied on: the account's one webhook URL belongs to the
   * owner's other apps, which share its key. So a correctly signed event is not necessarily
   * this site's. One that is not about a charge, or about a payment this site did not start,
   * is acknowledged and left alone, without asking Paystack and without logging it. One of
   * this site's own is checked with Paystack exactly as a donor's return is.
   */
  async handlePaystackWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    if (!this.paystack.isConfigured()) {
      throw new ServiceUnavailableError('Paystack is not configured');
    }
    this.paystack.verifyWebhookSignature(rawBody, signature);
    const reference = chargeReferenceOf(rawBody);
    const donation = reference ? await this.paystackDonation(reference) : null;
    if (!donation || donation.status === DonationStatus.Succeeded) {
      return;
    }
    try {
      // Never trust the payload: Paystack's own record decides.
      await this.checkWithPaystack(donation);
    } catch (error) {
      // Paystack has no payment by this reference: nothing to do, and nothing a retry would change.
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
    }
  }

  /**
   * The donor's return from Paystack's checkout: the API asks Paystack server to server, since
   * no webhook may ever arrive. A payment still under way ('abandoned', 'ongoing', 'pending',
   * 'processing', 'queued') leaves the gift pending, as mobile money can be approved after the
   * donor is back; the hourly check closes it later. Only Paystack's 'failed' fails it here.
   */
  async confirmPaystackReturn(reference: string): Promise<DonationConfirmation> {
    const donation = await this.paystackDonation(reference);
    if (!donation) {
      // One answer for everything that is not one of this site's gifts, so this public page
      // tells nobody anything about the other apps' payments on the shared account.
      throw new NotFoundError('Payment reference');
    }
    // A confirmed gift stays confirmed: nothing to ask Paystack about.
    if (donation.status !== DonationStatus.Succeeded) {
      if (!this.paystack.isConfigured()) {
        throw new ServiceUnavailableError('Paystack is not configured');
      }
      await this.checkWithPaystack(donation);
    }
    const current = (await this.donations.findByReference(reference)) ?? donation;
    return {
      status: current.status,
      amount: donationAmountOf(current),
      currency: donationCurrencyOf(current),
    };
  }

  /**
   * The hourly check of one gift (see `paystack-check.ts`): a pending one, or one failed within
   * the last day, which a later success still lifts. A success or a failure counts as on a
   * return. A payment still not made once the gift was started before `giveUpBefore` never will
   * be: a pending gift is closed as failed. Answers what the gift is now, whoever settled it:
   * this check, or a donor's return or a webhook while it ran.
   */
  async recheckPaystack(
    donation: HydratedDocument<DonationDocument>,
    giveUpBefore: Date,
  ): Promise<DonationStatus> {
    let outcome: PaystackCheck = 'unpaid';
    try {
      outcome = await this.checkWithPaystack(donation);
    } catch (error) {
      // Paystack has no payment by this reference, so nothing was paid. Any other error says
      // nothing about the payment, and the gift waits for the next run.
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
    }
    if (outcome === 'unpaid' && donation.createdAt <= giveUpBefore) {
      await this.markStatus(donation.reference, DonationStatus.Failed);
    }
    const current = await this.donations.findByReference(donation.reference);
    return current?.status ?? donation.status;
  }

  /**
   * One of this site's Paystack gifts, by the reference a donor, a webhook or the hourly check
   * brings. A reference that is malformed, or that is not a Paystack donation of this site's,
   * finds nothing, and so is never sent on to Paystack.
   */
  private async paystackDonation(
    reference: string,
  ): Promise<HydratedDocument<DonationDocument> | null> {
    if (!isPaystackReference(reference)) {
      return null;
    }
    const donation = await this.donations.findByReference(reference);
    return donation?.provider === PaymentProvider.Paystack ? donation : null;
  }

  /**
   * Ask Paystack about one of this site's gifts and act on its answer, the same whichever path
   * asked. A success counts only when the record is this gift's payment, in its currency and
   * for its amount; 'failed' fails the gift; anything else leaves it as it is.
   */
  private async checkWithPaystack(
    donation: HydratedDocument<DonationDocument>,
  ): Promise<PaystackCheck> {
    // Stamped before asking, so a gift Paystack cannot answer for goes to the back of the queue.
    await this.donations.recordCheck(donation.id, new Date());
    const verified = await this.paystack.verify(donation.reference);
    const mismatch = paystackMismatch(donation, verified);
    if (mismatch) {
      // The reason and the figures; never the donor, and nothing else of Paystack's record.
      this.logger.warn(
        {
          reference: donation.reference,
          reason: mismatch,
          status: verified.status,
          expectedCurrency: donationCurrencyOf(donation),
          expectedMinorUnits: toMinorUnits(donationAmountOf(donation)),
          requestedMinorUnits: verified.requestedMinor,
          chargedMinorUnits: verified.amountMinor,
          currency: verified.currency,
        },
        'Paystack payment does not match its donation; not acting on it',
      );
      return 'unpaid';
    }
    if (verified.status === 'success') {
      await this.markSucceeded(donation.reference);
      return 'succeeded';
    }
    if (verified.status === 'failed') {
      await this.markStatus(donation.reference, DonationStatus.Failed);
      return 'failed';
    }
    return 'unpaid';
  }

  /**
   * Mark a Stripe donation `Succeeded` only after confirming, against the gateway's own record,
   * that the transaction actually succeeded for the amount and currency we recorded. This
   * closes the gap where a signed "success" event was trusted to imply the stored amount was
   * paid, letting an attacker fund a far smaller charge against the same reference.
   */
  private async confirmSuccess(
    reference: string,
    gateway: GatewayCharge & { gatewaySucceeded: boolean },
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
    const mismatch = chargeMismatch(donation, gateway);
    if (mismatch) {
      this.logger.warn(
        {
          reference,
          reason: mismatch,
          expectedCurrency: donationCurrencyOf(donation),
          expectedMinorUnits: toMinorUnits(donationAmountOf(donation)),
          chargedMinorUnits: gateway.chargedMinorUnits,
          currency: gateway.currency,
        },
        'Donation amount/currency mismatch; refusing to mark succeeded',
      );
      return;
    }
    await this.markSucceeded(reference);
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
      donationId,
    });
    return {
      donationId,
      provider: PaymentProvider.Paystack,
      reference: init.reference,
      authorizationUrl: init.authorizationUrl,
    };
  }

  /**
   * A verified success also lifts a gift out of Failed: a declined first try, or a checkout
   * seen as failed that was completed afterwards, is still a gift that arrived.
   */
  private async markSucceeded(reference: string): Promise<void> {
    const updated = await this.donations.markSucceeded(reference);
    if (updated) {
      this.logger.info({ reference, status: DonationStatus.Succeeded }, 'Donation status updated');
    }
  }

  private async markStatus(reference: string, status: DonationStatus): Promise<void> {
    const updated = await this.donations.setStatus(reference, status);
    if (updated) {
      this.logger.info({ reference, status }, 'Donation status updated');
    }
  }
}
