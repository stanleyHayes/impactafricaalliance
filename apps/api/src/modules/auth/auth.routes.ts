import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { sensitiveRateLimit } from '../../middleware/rate-limit.js';

import { AuthController } from './auth.controller.js';
import { TokenService } from './token.service.js';

export const createAuthRouter = (container: DependencyContainer): Router => {
  const controller = container.resolve(AuthController);
  const tokens = container.resolve(TokenService);
  const router = Router();

  router.post('/login', sensitiveRateLimit, asyncHandler(controller.login));
  router.post('/refresh', sensitiveRateLimit, asyncHandler(controller.refresh));
  router.get('/me', requireAuth(tokens), asyncHandler(controller.me));
  router.patch('/me', requireAuth(tokens), asyncHandler(controller.updateProfile));
  router.post(
    '/change-password',
    requireAuth(tokens),
    sensitiveRateLimit,
    asyncHandler(controller.changePassword),
  );

  return router;
};
