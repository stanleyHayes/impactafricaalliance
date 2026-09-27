import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

export interface FormRouters {
  publicRouter: Router;
  adminRouter: Router;
}

/**
 * Forms (plan §3.4): the public applicant endpoints at `/api/forms` and the
 * builder at `/api/admin/forms`.
 *
 * The foundation mounts both so the paths exist from the first deploy, with
 * the admin preamble already in place. The forms module adds the routes: the
 * public ones with their own rate limiters (`formDraftRateLimit` and the rest
 * in `middleware/rate-limit.ts`), the admin ones each with its own
 * `requirePermission('forms:<action>')`. Until then both fall through to the
 * 404 handler.
 */
export const createFormRouters = (container: DependencyContainer): FormRouters => {
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  return { publicRouter, adminRouter };
};
