import { peopleQuerySchema, UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { parseWith } from '../../common/validate.js';
import {
  requireAnyPermission,
  requireAuth,
  requireRole,
} from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { PeopleService } from './people.service.js';

/**
 * `GET /api/admin/people`: the colleague picker behind every work module.
 *
 * Open to anyone who can read one of those modules, because each of them
 * needs to name people; closed to everyone else, because a staff list is
 * still a staff list. Returns `Paginated<PersonSummary>` of active accounts.
 */
export const createPeopleRouter = (container: DependencyContainer): Router => {
  const people = container.resolve(PeopleService);
  const tokens = container.resolve(TokenService);
  const router = Router();

  router.use(
    requireAuth(tokens),
    requireRole(UserRole.Admin, UserRole.Editor),
    requireAnyPermission(
      'projects:read',
      'tasks:read',
      'forms:read',
      'applications:read',
      'impact-stories:read',
    ),
  );

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseWith(peopleQuerySchema, req.query);
      res.json(await people.search(query));
    }),
  );

  return router;
};
