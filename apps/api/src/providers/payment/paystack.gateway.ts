import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { DonationCurrency } from '@iaa/shared';
import axios, { type AxiosInstance } from 'axios';
import { inject, injectable } from 'tsyringe';

import {
  NotFoundError,
  ServiceUnavailableError,
  WebhookSignatureError,
} from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

/**
 * The owner's Paystack account, keys and all, is shared with his other apps. This site's
 * payments say whose they are: every reference starts with `iaa-`, and the metadata names
 * this site as its `source`.
 */
export const PAYSTACK_SOURCE = 'impact-africa-alliance';

/** What the owner sees next to each of this site's payments in Paystack's dashboard. */
const WEBSITE_NAME = 'Impact Africa Alliance';

/** Paystack takes letters, digits, '-', '.' and '=' in a reference. */
const REFERENCE_PATTERN = /^[A-Za-z0-9.=-]{1,100}$/;

/** A reference for a new payment: `iaa-` and a UUID, nothing Paystack would refuse. */
export const newPaystackReference = (): string => `iaa-${randomUUID()}`;

/**
 * Whether a reference is one this site could have given Paystack. Anything else is never
 * looked up, let alone sent on to Paystack. Every one this site makes has a letter or a digit;
 * one of dots alone ('.', '..') would even make the verify address another endpoint's.
 */
export const isPaystackReference = (reference: string): boolean =>
  REFERENCE_PATTERN.test(reference) && /[A-Za-z0-9]/.test(reference);

/**
 * The website's page Paystack sends a donor back to after checkout, on PUBLIC_SITE_URL's origin.
 * Built from the parsed address, never the text as written: that is what production checked.
 */
export const paystackReturnUrl = (siteUrl: string): string =>
  `${new URL(siteUrl).origin}/donate/complete`;

/** Where Paystack's Cancel button takes the donor: the same page, told nothing was paid. */
export const paystackCancelUrl = (siteUrl: string, reference: string): string => {
  const url = new URL(paystackReturnUrl(siteUrl));
  url.searchParams.set('reference', reference);
  url.searchParams.set('cancelled', '1');
  return url.toString();
};

export interface PaystackInit {
  reference: string;
  authorizationUrl: string;
}

export interface PaystackCharge {
  /** Lowest unit of the gateway's currency: pesewas for cedis, cents for dollars. */
  amountMinor: number;
  email: string;
  reference: string;
  /** The donation's id, shown with the payment in Paystack's dashboard. */
  donationId: string;
}

export interface PaystackVerification {
  status: string;
  /** The reference Paystack reports, which must be the one it was asked about. */
  reference?: string;
  /** What the donor paid, in pesewas or cents: with Paystack's fee when the donor bears it. */
  amountMinor: number;
  /** What the transaction asked for, before any fee passed on to the donor. */
  requestedMinor?: number;
  currency: string;
  /** Who started the payment, when its metadata says: this site's is `PAYSTACK_SOURCE`. */
  source?: string;
}

interface PaystackInitResponse {
  data?: { reference?: string; authorization_url?: string };
}

interface PaystackVerifyResponse {
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    requested_amount?: number;
    currency?: string;
    metadata?: unknown;
  };
}

/** Paystack's metadata: an object, or now and then the same object as a JSON string. */
const metadataOf = (value: unknown): Record<string, unknown> | undefined => {
  let metadata = value;
  if (typeof value === 'string') {
    try {
      metadata = JSON.parse(value) as unknown;
    } catch {
      return undefined;
    }
  }
  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : undefined;
};

/** The source a payment's metadata names, if it names one. */
const sourceOf = (metadata: unknown): { source?: string } => {
  const source = metadataOf(metadata)?.source;
  return source === undefined || source === null ? {} : { source: String(source) };
};

/**
 * What Paystack said when a call failed: its HTTP status and message, nothing more. (Not
 * `message`: the log's serializer would take an object with one for an error of its own.)
 */
export interface PaystackFailure {
  status?: number;
  reason?: string;
}

/**
 * A call to Paystack that failed or came back malformed. The response body says only that
 * Paystack is unavailable; the log gets Paystack's own status and message from `paystack`.
 */
export class PaystackUnavailableError extends ServiceUnavailableError {
  readonly paystack: PaystackFailure;

  constructor(paystack: PaystackFailure) {
    super('Paystack could not process the request');
    this.paystack = paystack;
  }
}

/**
 * Paystack's side of a failed call. The HTTP client's own error must not travel further: it
 * carries the request it sent, with the secret key in its Authorization header and the donor's
 * email in its body, and the error log would print all of it.
 */
const failureOf = (error: unknown): PaystackFailure => {
  if (!axios.isAxiosError(error)) {
    return { reason: error instanceof Error ? error.name : 'Unknown error' };
  }
  const body: unknown = error.response?.data;
  const said =
    typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : undefined;
  return {
    status: error.response?.status,
    // Paystack's own words when it answered; the network's code (ETIMEDOUT) when it did not.
    reason: typeof said === 'string' ? said.slice(0, 200) : error.code,
  };
};

/**
 * Paystack answers an unknown reference with a 400 saying "Transaction reference not found". Any
 * other refusal (a bad request, a key it does not accept) says nothing about the payment.
 */
const isUnknownReference = (failure: PaystackFailure): boolean =>
  (failure.status === 400 || failure.status === 404) &&
  /reference not found/i.test(failure.reason ?? '');

/** Wrapper over the Paystack REST API for donation transactions. */
@injectable()
export class PaystackGateway {
  private http?: AxiosInstance;

  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.paystack.secretKey);
  }

  /** Every charge is in the account's currency (PAYSTACK_CURRENCY). */
  get currency(): DonationCurrency {
    return this.config.paystack.currency;
  }

  /** Where every checkout sends its donor back: PUBLIC_SITE_URL's return page. */
  get returnUrl(): string {
    return paystackReturnUrl(this.config.siteUrl);
  }

  async initialize(charge: PaystackCharge): Promise<PaystackInit> {
    const client = this.client();
    let body: PaystackInitResponse;
    try {
      ({ data: body } = await client.post<PaystackInitResponse>('/transaction/initialize', {
        email: charge.email,
        amount: charge.amountMinor,
        currency: this.currency,
        reference: charge.reference,
        // The dashboard's Callback URL belongs to the other apps on the account, so every
        // payment names its own way back, built from PUBLIC_SITE_URL and nothing else. The
        // return page has the API verify the payment with Paystack.
        callback_url: this.returnUrl,
        metadata: this.metadataFor(charge),
      }));
    } catch (error) {
      throw new PaystackUnavailableError(failureOf(error));
    }
    const reference = body.data?.reference;
    const authorizationUrl = body.data?.authorization_url;
    if (!reference || !authorizationUrl) {
      throw new PaystackUnavailableError({ reason: 'Initialize answered without a checkout URL' });
    }
    return { reference, authorizationUrl };
  }

  async verify(reference: string): Promise<PaystackVerification> {
    // Not one this site could have made, so not one to ask Paystack about.
    if (!isPaystackReference(reference)) {
      throw new NotFoundError('Payment reference');
    }
    const client = this.client();
    let body: PaystackVerifyResponse;
    try {
      ({ data: body } = await client.get<PaystackVerifyResponse>(
        `/transaction/verify/${encodeURIComponent(reference)}`,
      ));
    } catch (error) {
      const failure = failureOf(error);
      if (isUnknownReference(failure)) {
        throw new NotFoundError('Payment reference');
      }
      throw new PaystackUnavailableError(failure);
    }
    const data = body.data;
    if (!data?.status || typeof data.amount !== 'number' || !data.currency) {
      throw new PaystackUnavailableError({ reason: 'Verify answered without a transaction' });
    }
    return {
      status: data.status,
      ...(typeof data.reference === 'string' ? { reference: data.reference } : {}),
      amountMinor: data.amount,
      ...(typeof data.requested_amount === 'number'
        ? { requestedMinor: data.requested_amount }
        : {}),
      currency: data.currency,
      ...sourceOf(data.metadata),
    };
  }

  /**
   * Verify the `x-paystack-signature` header: an HMAC-SHA512 of the raw body, keyed with the
   * account's secret key. Paystack has no separate webhook secret.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): void {
    const secret = this.config.paystack.secretKey;
    if (!secret) {
      throw new ServiceUnavailableError('Paystack is not configured');
    }
    if (!signature) {
      throw new WebhookSignatureError('Missing Paystack signature header');
    }
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new WebhookSignatureError('Invalid Paystack signature');
    }
  }

  /**
   * What travels with the payment. `source` and the donation's id come back whenever Paystack
   * reports on it; the custom fields are what the owner sees on it in the shared dashboard;
   * `cancel_action` is where Paystack's Cancel button goes instead of the dashboard's URL.
   */
  private metadataFor(charge: PaystackCharge): Record<string, unknown> {
    return {
      source: PAYSTACK_SOURCE,
      donation_id: charge.donationId,
      cancel_action: paystackCancelUrl(this.config.siteUrl, charge.reference),
      custom_fields: [
        { display_name: 'Website', variable_name: 'website', value: WEBSITE_NAME },
        { display_name: 'Donation ID', variable_name: 'donation_id', value: charge.donationId },
      ],
    };
  }

  private client(): AxiosInstance {
    const secretKey = this.config.paystack.secretKey;
    if (!secretKey) {
      throw new ServiceUnavailableError('Paystack is not configured');
    }
    if (!this.http) {
      this.http = axios.create({
        baseURL: this.config.paystack.apiUrl,
        headers: { Authorization: `Bearer ${secretKey}` },
        timeout: 15_000,
      });
    }
    return this.http;
  }
}
