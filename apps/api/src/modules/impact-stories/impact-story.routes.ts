import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

export interface ImpactStoryRouters {
  publicRouter: Router;
  adminRouter: Router;
}

/**
 * Impact stories (plan §3.5): published stories at `/api/impact-stories` and
 * the editor at `/api/admin/impact-stories`.
 *
 * The foundation mounts both so the paths exist from the first deploy, with
 * the admin preamble already in place. The impact stories module adds the
 * routes (on the public router, `/preview` before `/:slug`; on the admin
 * router, each with its own `requirePermission('impact-stories:<action>')`).
 * Until then both fall through to the 404 handler.
 */
export const createImpactStoryRouters = (container: DependencyContainer): ImpactStoryRouters => {
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  return { publicRouter, adminRouter };
};
