import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

export interface ApplicationRouters {
  adminRouter: Router;
}

/**
 * Applications, the review side of forms (plan §3.4), mounted at
 * `/api/admin/applications`. Applicants never reach this router: their drafts
 * and submissions go through the public forms router.
 *
 * The foundation mounts this with the admin preamble in place, so the path is
 * guarded from the first deploy. The forms module adds its routes below the
 * preamble, each with its own `requirePermission('applications:<action>')`;
 * until then every signed-in request falls through to the 404 handler.
 */
export const createApplicationRouters = (container: DependencyContainer): ApplicationRouters => {
  const tokens = container.resolve(TokenService);

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  return { adminRouter };
};
