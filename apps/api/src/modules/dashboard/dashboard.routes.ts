import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { DashboardService } from './dashboard.service.js';

/** Admin-console overview aggregates. Readable by both admins and editors. */
export const createDashboardRouter = (container: DependencyContainer): Router => {
  const tokens = container.resolve(TokenService);
  const service = container.resolve(DashboardService);
  const router = Router();

  router.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await service.summary());
    }),
  );

  return router;
};
