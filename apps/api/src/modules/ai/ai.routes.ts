import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import type { AppConfig } from '../../config/env.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { sensitiveRateLimit } from '../../middleware/rate-limit.js';
import { TokenService } from '../auth/token.service.js';

import { AiController } from './ai.controller.js';
import { AiAssistService } from './ai.service.js';

/** Authenticated AI writing-assistant routes (mounted under /api/admin/ai). */
export const createAiRouter = (container: DependencyContainer, config: AppConfig): Router => {
  const tokens = container.resolve(TokenService);
  const controller = new AiController(new AiAssistService(config.anthropic.apiKey));
  const router = Router();

  router.post(
    '/assist',
    requireAuth(tokens),
    requireRole(UserRole.Admin, UserRole.Editor),
    sensitiveRateLimit,
    asyncHandler(controller.assist),
  );

  return router;
};
