import { AdminResource, eventMessageInputSchema, UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import {
  requireAuth,
  requirePermissionFor,
  requireRole,
} from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { EventMessageService } from './event-message.service.js';

export const createEventMessageRouter = (container: DependencyContainer): Router => {
  const tokens = container.resolve(TokenService);
  const service = container.resolve(EventMessageService);
  const router = Router();

  // Writing to every registrant is not an editorial change, so it is held to
  // the same bar as the rest of the console rather than left open.
  router.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));
  router.use(requirePermissionFor(AdminResource.Events));

  router.get(
    '/:eventId',
    asyncHandler(async (req, res) => {
      res.json(await service.listForEvent(String(req.params.eventId)));
    }),
  );

  router.post(
    '/:eventId',
    asyncHandler(async (req, res) => {
      const input = eventMessageInputSchema.parse(req.body);
      // The token carries the account's email, which is what the log needs.
      const sentBy = req.user?.email;
      res.status(201).json(await service.send(String(req.params.eventId), 'custom', input, sentBy));
    }),
  );

  return router;
};
