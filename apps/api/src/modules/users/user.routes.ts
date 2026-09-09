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

import { UserController } from './user.controller.js';

/** Admin-only user management routes (mounted under /api/admin/users). */
export const createUserRouter = (container: DependencyContainer): Router => {
  const controller = container.resolve(UserController);
  const tokens = container.resolve(TokenService);
  const router = Router();

  router.use(requireAuth(tokens), requireRole(UserRole.Admin));
  router.use(requirePermissionFor(AdminResource.Users));
  router.get('/', asyncHandler(controller.list));
  router.post('/', asyncHandler(controller.create));
  router.patch('/:id', asyncHandler(controller.update));
  router.patch('/:id/permissions', asyncHandler(controller.updatePermissions));
  router.delete('/:id', asyncHandler(controller.remove));

  return router;
};
