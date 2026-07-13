import {
  createDonationSchema,
  paginationQuerySchema,
  updatePaymentSettingsSchema,
} from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError, ValidationError } from '../../common/errors.js';
import { parseWith } from '../../common/validate.js';

import { PaymentSettingsService } from './payment-settings.service.js';
import { PaymentService } from './payment.service.js';

const header = (req: Request, name: string): string | undefined => {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const rawBodyOf = (req: Request): Buffer => {
  if (!req.rawBody) {
    throw new ValidationError('Missing raw request body for webhook verification');
  }
  return req.rawBody;
};

@injectable()
export class PaymentController {
  constructor(
    @inject(PaymentService) private readonly payments: PaymentService,
    @inject(PaymentSettingsService) private readonly settings: PaymentSettingsService,
  ) {}

  createDonation = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(createDonationSchema, req.body);
    if (!(await this.settings.isAccepting(input.provider))) {
      throw new ServiceUnavailableError(
        `${input.provider} donations are not currently enabled`,
      );
    }
    res.status(201).json(await this.payments.createDonation(input));
  };

  providers = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.settings.getPublicProviders());
  };

  stripeWebhook = async (req: Request, res: Response): Promise<void> => {
    await this.payments.handleStripeWebhook(rawBodyOf(req), header(req, 'stripe-signature'));
    res.json({ received: true });
  };

  paystackWebhook = async (req: Request, res: Response): Promise<void> => {
    await this.payments.handlePaystackWebhook(rawBodyOf(req), header(req, 'x-paystack-signature'));
    res.json({ received: true });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
    res.json(await this.payments.list(page, pageSize));
  };

  getSettings = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.settings.getStatus());
  };

  updateSettings = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(updatePaymentSettingsSchema, req.body);
    res.json(await this.settings.update(input));
  };
}
