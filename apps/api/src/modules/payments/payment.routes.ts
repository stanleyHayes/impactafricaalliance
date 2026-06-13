import { UserRole } from '@iaa/shared';
import express, { Router, type NextFunction, type Request, type Response } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { sensitiveRateLimit } from '../../middleware/rate-limit.js';
import { TokenService } from '../auth/token.service.js';

import { PaymentController } from './payment.controller.js';

export interface PaymentRouters {
  /** Raw-body webhook routes — must be mounted BEFORE the JSON body parser. */
  webhookRouter: Router;
  /** Public donation initiation (JSON body). */
  donateRouter: Router;
  /** Admin-only donation log. */
  adminRouter: Router;
}

const captureRawBody = (req: Request, _res: Response, next: NextFunction): void => {
  req.rawBody = req.body as Buffer;
  next();
};

export const createPaymentRouters = (container: DependencyContainer): PaymentRouters => {
  const controller = container.resolve(PaymentController);
  const tokens = container.resolve(TokenService);
  const rawJson = express.raw({ type: 'application/json', limit: '1mb' });

  const webhookRouter = Router();
  webhookRouter.post('/stripe', rawJson, captureRawBody, asyncHandler(controller.stripeWebhook));
  webhookRouter.post(
    '/paystack',
    rawJson,
    captureRawBody,
    asyncHandler(controller.paystackWebhook),
  );

  const donateRouter = Router();
  donateRouter.post('/', sensitiveRateLimit, asyncHandler(controller.createDonation));

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin));
  adminRouter.get('/', asyncHandler(controller.list));

  return { webhookRouter, donateRouter, adminRouter };
};
