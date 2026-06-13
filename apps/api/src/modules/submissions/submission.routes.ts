import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { sensitiveRateLimit } from '../../middleware/rate-limit.js';
import { TokenService } from '../auth/token.service.js';

import { SubmissionController } from './submission.controller.js';

export interface SubmissionRouters {
  publicRouter: Router;
  adminRouter: Router;
}

/** Public form intake + admin inbox for inbound submissions. */
export const createSubmissionRouters = (container: DependencyContainer): SubmissionRouters => {
  const controller = container.resolve(SubmissionController);
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();
  publicRouter.post('/', sensitiveRateLimit, asyncHandler(controller.submit));
  publicRouter.post('/subscribe', sensitiveRateLimit, asyncHandler(controller.subscribe));

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));
  adminRouter.get('/', asyncHandler(controller.list));
  adminRouter.patch('/:id', asyncHandler(controller.setStatus));
  adminRouter.get('/subscribers/list', asyncHandler(controller.listSubscribers));

  return { publicRouter, adminRouter };
};
