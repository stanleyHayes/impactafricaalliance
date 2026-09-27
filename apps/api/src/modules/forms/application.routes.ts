import {
  applicationCountsQuerySchema,
  applicationExportQuerySchema,
  applicationListQuerySchema,
  applicationReviewInputSchema,
  applicationStatusChangeSchema,
  objectIdSchema,
  stableIdSchema,
  UserRole,
} from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';
import { z } from 'zod';

import { asyncHandler } from '../../common/async-handler.js';
import { parseWith } from '../../common/validate.js';
import { requireAuth, requirePermission, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { ApplicationService } from './application.service.js';
import { actorOf } from './form-mappers.js';

export interface ApplicationRouters {
  adminRouter: Router;
}

const idParams = z.object({ id: objectIdSchema });
const reviewParams = z.object({ id: objectIdSchema, reviewId: stableIdSchema });

/**
 * Applications, the review side of forms (plan §3.4), mounted at
 * `/api/admin/applications`. Applicants never reach this router: their drafts
 * and submissions go through the public forms router.
 *
 * Every route guards its own permission, `applications:read` to look and
 * `applications:update` to review or move an application along (plan D2).
 * Editors do not read applications by default, because they hold applicants'
 * personal data. `/counts` and `/export` come before `/:id`, which would
 * otherwise take them for ids.
 */
export const createApplicationRouters = (container: DependencyContainer): ApplicationRouters => {
  const tokens = container.resolve(TokenService);
  const applications = container.resolve(ApplicationService);

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  adminRouter.get(
    '/',
    requirePermission('applications:read'),
    asyncHandler(async (req, res) => {
      res.json(await applications.list(parseWith(applicationListQuerySchema, req.query)));
    }),
  );

  adminRouter.get(
    '/counts',
    requirePermission('applications:read'),
    asyncHandler(async (req, res) => {
      res.json(await applications.counts(parseWith(applicationCountsQuerySchema, req.query)));
    }),
  );

  adminRouter.get(
    '/export',
    requirePermission('applications:read'),
    asyncHandler(async (req, res) => {
      const { formId } = parseWith(applicationExportQuerySchema, req.query);
      res.json(await applications.exportCsv(formId));
    }),
  );

  adminRouter.get(
    '/:id',
    requirePermission('applications:read'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      res.json(await applications.get(id));
    }),
  );

  adminRouter.patch(
    '/:id/status',
    requirePermission('applications:update'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const input = parseWith(applicationStatusChangeSchema, req.body);
      res.json(await applications.changeStatus(id, input, actorOf(req)));
    }),
  );

  adminRouter.post(
    '/:id/reviews',
    requirePermission('applications:update'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const input = parseWith(applicationReviewInputSchema, req.body);
      res.status(201).json(await applications.addReview(id, input, actorOf(req)));
    }),
  );

  adminRouter.delete(
    '/:id/reviews/:reviewId',
    requirePermission('applications:update'),
    asyncHandler(async (req, res) => {
      const { id, reviewId } = parseWith(reviewParams, req.params);
      await applications.removeReview(id, reviewId, actorOf(req));
      res.status(204).end();
    }),
  );

  return { adminRouter };
};
