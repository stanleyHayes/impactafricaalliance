import { AdminResource, UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import {
  requireAuth,
  requirePermissionFor,
  requireRole,
} from '../../middleware/auth.middleware.js';
import { sensitiveRateLimit } from '../../middleware/rate-limit.js';
import { TokenService } from '../auth/token.service.js';

import { PrivacyRequestController } from './privacy-request.controller.js';

export interface PrivacyRequestRouters {
  publicRouter: Router;
  adminRouter: Router;
}

export const createPrivacyRequestRouters = (
  container: DependencyContainer,
): PrivacyRequestRouters => {
  const controller = container.resolve(PrivacyRequestController);
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();
  publicRouter.post('/', sensitiveRateLimit, asyncHandler(controller.create));

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));
  adminRouter.use(requirePermissionFor(AdminResource.PrivacyRequests));
  adminRouter.get('/', asyncHandler(controller.list));
  adminRouter.get('/export', asyncHandler(controller.exportData));
  adminRouter.delete('/:id', asyncHandler(controller.remove));
  adminRouter.patch('/:id', asyncHandler(controller.update));

  return { publicRouter, adminRouter };
};
