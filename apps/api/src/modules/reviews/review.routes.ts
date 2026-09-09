import {
  AdminResource,
  eventReviewInputSchema,
  objectIdSchema,
  organisationReviewInputSchema,
  reviewModerationSchema,
  UserRole,
  type ReviewStatus,
} from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import {
  requireAuth,
  requirePermissionFor,
  requireRole,
} from '../../middleware/auth.middleware.js';
import { sensitiveRateLimit } from '../../middleware/rate-limit.js';
import { TokenService } from '../auth/token.service.js';

import { ReviewService } from './review.service.js';

const page = (value: unknown): number => Math.max(1, Number(value) || 1);

export const createReviewRouters = (
  container: DependencyContainer,
): { publicRouter: Router; adminRouter: Router } => {
  const service = container.resolve(ReviewService);
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();

  /** What a review link is for, so the form can name the event before it is filled in. */
  publicRouter.get(
    '/link/:token',
    asyncHandler(async (req, res) => {
      res.json(await service.describeToken(String(req.params.token)));
    }),
  );

  publicRouter.post(
    '/events',
    sensitiveRateLimit,
    asyncHandler(async (req, res) => {
      const input = eventReviewInputSchema.parse(req.body);
      res.status(202).json(await service.submitEventReview(input));
    }),
  );

  publicRouter.post(
    '/organisation',
    sensitiveRateLimit,
    asyncHandler(async (req, res) => {
      const input = organisationReviewInputSchema.parse(req.body);
      await service.submitOrganisationReview(input);
      // 202: taken, but nothing happens until the address is confirmed.
      res.status(202).json({ verificationSent: true });
    }),
  );

  publicRouter.post(
    '/confirm',
    sensitiveRateLimit,
    asyncHandler(async (req, res) => {
      await service.confirmOrganisationReview(String(req.body?.token ?? ''));
      res.json({ confirmed: true });
    }),
  );

  publicRouter.get(
    '/organisation',
    asyncHandler(async (req, res) => {
      res.json(await service.publicReviews('organisation', { page: page(req.query.page) }));
    }),
  );

  publicRouter.get(
    '/organisation/summary',
    asyncHandler(async (_req, res) => {
      res.json(await service.summary('organisation'));
    }),
  );

  publicRouter.get(
    '/events/:eventId',
    asyncHandler(async (req, res) => {
      const eventId = String(req.params.eventId);
      const [reviews, summary] = await Promise.all([
        service.publicReviews('event', { eventId, page: page(req.query.page) }),
        service.summary('event', eventId),
      ]);
      res.json({ ...reviews, summary });
    }),
  );

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));
  adminRouter.use(requirePermissionFor(AdminResource.Reviews));
  adminRouter.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await service.remove(objectIdSchema.parse(req.params.id));
      res.status(204).end();
    }),
  );

  adminRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      res.json(
        await service.list({
          status: req.query.status as ReviewStatus | undefined,
          subject: req.query.subject as 'event' | 'organisation' | undefined,
          eventId:
            req.query.eventId === undefined ? undefined : objectIdSchema.parse(req.query.eventId),
          page: page(req.query.page),
        }),
      );
    }),
  );

  adminRouter.get(
    '/events/:eventId/summary',
    asyncHandler(async (req, res) => {
      res.json(await service.summary('event', objectIdSchema.parse(req.params.eventId)));
    }),
  );

  adminRouter.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const decision = reviewModerationSchema.parse(req.body);
      await service.moderate(String(req.params.id), decision);
      res.status(204).end();
    }),
  );

  return { publicRouter, adminRouter };
};
