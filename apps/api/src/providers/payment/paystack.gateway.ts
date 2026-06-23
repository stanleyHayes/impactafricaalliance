import { createHmac, timingSafeEqual } from 'node:crypto';

import axios, { type AxiosInstance } from 'axios';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError } from '../../common/errors.js';
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
  ): Promise<PaystackInit> {
    const { data } = await this.client().post<PaystackInitResponse>('/transaction/initialize', {
      email: donorEmail,
      amount: amountUsdCents,
      currency: 'USD',
      reference,
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
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.config.paystack.webhookSecret ?? this.config.paystack.secretKey;
    if (!secret || !signature) {
      return false;
    }
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
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
