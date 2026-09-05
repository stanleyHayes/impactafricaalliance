import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { sensitiveRateLimit } from '../../middleware/rate-limit.js';
import { TokenService } from '../auth/token.service.js';

import { EventRegistrationController } from './event-registration.controller.js';

export interface EventRegistrationRouters {
  publicRouter: Router;
  adminRouter: Router;
}

/** Public event sign-up plus the admin view of who registered. */
export const createEventRegistrationRouters = (
  container: DependencyContainer,
): EventRegistrationRouters => {
  const controller = container.resolve(EventRegistrationController);
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();
  publicRouter.post('/:eventId/register', sensitiveRateLimit, asyncHandler(controller.register));
  // Two segments, so it never collides with the content router's GET /:key.
  publicRouter.get('/:eventId/calendar.ics', asyncHandler(controller.calendar));

  // Mounted on its own path rather than under /api/admin/events, whose content
  // router already claims GET /:id — "/counts" would be swallowed by it.
  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));
  adminRouter.get('/counts', asyncHandler(controller.counts));
  adminRouter.get('/:eventId/qr', asyncHandler(controller.qr));
  adminRouter.get('/:eventId', asyncHandler(controller.list));

  return { publicRouter, adminRouter };
};
