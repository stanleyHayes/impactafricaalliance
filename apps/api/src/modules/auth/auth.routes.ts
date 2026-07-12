import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { sensitiveRateLimit } from '../../middleware/rate-limit.js';

import { AuthController } from './auth.controller.js';
import { PasswordResetController } from './password-reset.controller.js';
import { TokenService } from './token.service.js';

export const createAuthRouter = (container: DependencyContainer): Router => {
  const controller = container.resolve(AuthController);
  const passwordResetController = container.resolve(PasswordResetController);
  const tokens = container.resolve(TokenService);
  const router = Router();

  router.post('/forgot-password', sensitiveRateLimit, asyncHandler(passwordResetController.forgotPassword));
  router.post('/reset-password', sensitiveRateLimit, asyncHandler(passwordResetController.resetPassword));
  router.post('/accept-invitation', sensitiveRateLimit, asyncHandler(controller.acceptInvitation));
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
  router.get('/mfa/status', requireAuth(tokens), asyncHandler(controller.getMfaStatus));
  router.post('/mfa/setup', requireAuth(tokens), sensitiveRateLimit, asyncHandler(controller.setupMfa));
  router.post(
    '/mfa/verify-setup',
    requireAuth(tokens),
    sensitiveRateLimit,
    asyncHandler(controller.verifyMfaSetup),
  );
  router.post(
    '/mfa/disable',
    requireAuth(tokens),
    sensitiveRateLimit,
    asyncHandler(controller.disableMfa),
  );

  return router;
};
