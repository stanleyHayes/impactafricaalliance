import { createHmac, timingSafeEqual } from 'node:crypto';

import axios, { type AxiosInstance } from 'axios';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError, WebhookSignatureError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInit {
  reference: string;
  authorizationUrl: string;
}

interface PaystackInitResponse {
  data: { reference: string; authorization_url: string };
}

interface PaystackVerifyResponse {
  data: { status: string; reference: string; amount: number; currency: string };
}

/** Wrapper over the Paystack REST API for donation transactions. */
@injectable()
export class PaystackGateway {
  private http?: AxiosInstance;

  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.paystack.secretKey);
  }

  async initialize(
    amountUsdCents: number,
    donorEmail: string,
    reference: string,
    callbackUrl?: string,
  ): Promise<PaystackInit> {
    const { data } = await this.client().post<PaystackInitResponse>('/transaction/initialize', {
      email: donorEmail,
      amount: amountUsdCents,
      currency: 'USD',
      reference,
      // Donors land back on the marketing site after checkout instead of Paystack's
      // default receipt page; the return page re-verifies the transaction server-side.
      callback_url: callbackUrl ?? `${this.config.siteUrl}/donate/complete`,
    });
    return { reference: data.data.reference, authorizationUrl: data.data.authorization_url };
  }

  async verify(
    reference: string,
  ): Promise<{ status: string; amountUsdCents: number; currency: string }> {
    const { data } = await this.client().get<PaystackVerifyResponse>(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    return {
      status: data.data.status,
      amountUsdCents: data.data.amount,
      currency: data.data.currency,
    };
  }

  /** Verify the `x-paystack-signature` header (HMAC-SHA512 of the raw body). */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): void {
    const secret = this.config.paystack.webhookSecret;
    if (!secret) {
      throw new ServiceUnavailableError('Paystack webhook secret is not configured');
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
        baseURL: PAYSTACK_BASE_URL,
        headers: { Authorization: `Bearer ${secretKey}` },
        timeout: 15_000,
      });
    }
    return this.http;
  }
}
