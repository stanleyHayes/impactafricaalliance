import { AdminResource, UserRole } from '@iaa/shared';
import express, {
  Router,
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { isUndecodablePathError } from '../../common/error-middleware.js';
import { NotFoundError } from '../../common/errors.js';
import {
  requireAuth,
  requirePermissionFor,
  requireRole,
} from '../../middleware/auth.middleware.js';
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

/**
 * A reference whose %-escapes do not decode never reaches the controller: the router fails the
 * request while reading it. It is no gift of this site's either, so it gets the same 404 as any
 * other reference that is not.
 */
const unreadableReference: ErrorRequestHandler = (error, _req, _res, next) => {
  next(isUndecodablePathError(error) ? new NotFoundError('Payment reference') : error);
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
  donateRouter.get('/providers', asyncHandler(controller.providers));
  // Limited ahead of the route, so a reference the router cannot read counts too.
  donateRouter.use('/paystack/verify', sensitiveRateLimit);
  donateRouter.get('/paystack/verify/:reference', asyncHandler(controller.paystackReturn));
  donateRouter.use('/paystack/verify', unreadableReference);
  donateRouter.post('/', sensitiveRateLimit, asyncHandler(controller.createDonation));

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin));
  adminRouter.use(requirePermissionFor(AdminResource.Donations));
  adminRouter.get('/', asyncHandler(controller.list));
  adminRouter.get('/settings', asyncHandler(controller.getSettings));
  adminRouter.patch('/settings', asyncHandler(controller.updateSettings));

  return { webhookRouter, donateRouter, adminRouter };
};
