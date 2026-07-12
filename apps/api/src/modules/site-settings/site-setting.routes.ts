import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { SiteSettingController } from './site-setting.controller.js';

export interface SiteSettingRouters {
  publicRouter: Router;
  adminRouter: Router;
}

export const createSiteSettingRouters = (container: DependencyContainer): SiteSettingRouters => {
  const controller = container.resolve(SiteSettingController);
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();
  publicRouter.get('/', asyncHandler(controller.get));

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));
  adminRouter.get('/', asyncHandler(controller.get));
  adminRouter.patch('/', asyncHandler(controller.update));

  return { publicRouter, adminRouter };
};
