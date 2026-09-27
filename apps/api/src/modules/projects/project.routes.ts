import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

export interface ProjectRouters {
  adminRouter: Router;
}

/**
 * Projects (plan §3.2), mounted at `/api/admin/projects`.
 *
 * The foundation mounts this with the admin preamble in place, so the path is
 * guarded from the first deploy. The projects module adds its routes below
 * the preamble, each with its own `requirePermission('projects:<action>')`;
 * until then every signed-in request falls through to the 404 handler.
 */
export const createProjectRouters = (container: DependencyContainer): ProjectRouters => {
  const tokens = container.resolve(TokenService);

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  return { adminRouter };
};
