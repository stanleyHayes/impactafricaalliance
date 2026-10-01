import { createHmac, timingSafeEqual } from 'node:crypto';

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

export interface PaystackInit {
  reference: string;
  authorizationUrl: string;
}

export interface PaystackCharge {
  /** Lowest unit of the gateway's currency: pesewas for cedis, cents for dollars. */
  amountMinor: number;
  email: string;
  reference: string;
  callbackUrl?: string;
}

export interface PaystackVerification {
  status: string;
  /** What the donor paid, in pesewas or cents: with Paystack's fee when the donor bears it. */
  amountMinor: number;
  /** What the transaction asked for, before any fee passed on to the donor. */
  requestedMinor?: number;
  currency: string;
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
  };
}

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

/** Paystack answers an unknown reference with a 400 ("Transaction reference not found"). */
const isUnknownReference = (failure: PaystackFailure): boolean =>
  failure.status === 400 || failure.status === 404;

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

  async initialize(charge: PaystackCharge): Promise<PaystackInit> {
    const client = this.client();
    let body: PaystackInitResponse;
    try {
      ({ data: body } = await client.post<PaystackInitResponse>('/transaction/initialize', {
        email: charge.email,
        amount: charge.amountMinor,
        currency: this.currency,
        reference: charge.reference,
        // Donors land back on the marketing site after checkout instead of Paystack's
        // default receipt page; the return page re-verifies the transaction server-side.
        callback_url: charge.callbackUrl ?? `${this.config.siteUrl}/donate/complete`,
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
      amountMinor: data.amount,
      ...(typeof data.requested_amount === 'number'
        ? { requestedMinor: data.requested_amount }
        : {}),
      currency: data.currency,
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
