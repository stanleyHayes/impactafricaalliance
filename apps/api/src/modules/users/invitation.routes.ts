import { AdminResource, UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import {
  requireAuth,
  requirePermissionFor,
  requireRole,
} from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { InvitationController } from './invitation.controller.js';

/** Admin-only invitation routes (mounted under /api/admin/invitations). */
export const createInvitationRouter = (container: DependencyContainer): Router => {
  const controller = container.resolve(InvitationController);
  const tokens = container.resolve(TokenService);
  const router = Router();

  router.use(requireAuth(tokens), requireRole(UserRole.Admin));
  router.use(requirePermissionFor(AdminResource.Users));
  router.post('/', asyncHandler(controller.create));

  return router;
};
