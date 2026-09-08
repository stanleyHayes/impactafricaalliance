import { pageViewInputSchema, UserRole } from '@iaa/shared';
import { Router, type Request } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import type { AppConfig } from '../../config/env.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { AnalyticsService, type VisitContext } from './analytics.service.js';

/** Windows an editor can ask for. Anything else is refused rather than guessed. */
const ALLOWED_WINDOWS = [7, 30, 90, 365];
const DEFAULT_WINDOW = 30;

const windowFrom = (value: unknown): number => {
  const days = Number(value);
  return ALLOWED_WINDOWS.includes(days) ? days : DEFAULT_WINDOW;
};

const header = (req: Request, name: string): string | undefined => {
  const value = req.get(name);
  return value && value.trim() !== '' ? value.trim() : undefined;
};

/**
 * Where the visit came from, as opposed to what the page claims.
 *
 * Location is only believed when the request carries the shared key, which the
 * marketing site's proxy adds and a browser cannot. Without it the visit is
 * still counted — it just has no country, which is honest rather than wrong.
 */
const visitContext = (req: Request, config: AppConfig): VisitContext => {
  const trusted =
    Boolean(config.analytics.ingestSecret) &&
    header(req, 'x-iaa-ingest-key') === config.analytics.ingestSecret;
  return {
    ip: req.ip,
    userAgent: header(req, 'user-agent'),
    ...(trusted
      ? {
          country: header(req, 'x-iaa-country'),
          region: header(req, 'x-iaa-region'),
          city: header(req, 'x-iaa-city'),
        }
      : {}),
  };
};

export const createAnalyticsRouters = (
  container: DependencyContainer,
  config: AppConfig,
): { publicRouter: Router; adminRouter: Router } => {
  const service = container.resolve(AnalyticsService);
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();

  publicRouter.post(
    '/collect',
    asyncHandler(async (req, res) => {
      const input = pageViewInputSchema.parse(req.body);
      await service.record(input, visitContext(req, config));
      // Nothing to say back, and a beacon does not wait for a body.
      res.status(204).end();
    }),
  );

  publicRouter.get(
    '/reach',
    asyncHandler(async (req, res) => {
      res.set('Cache-Control', 'public, max-age=300');
      res.json(await service.publicReach(windowFrom(req.query.days)));
    }),
  );

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));
  adminRouter.get(
    '/summary',
    asyncHandler(async (req, res) => {
      res.json(await service.summary(windowFrom(req.query.days)));
    }),
  );

  return { publicRouter, adminRouter };
};
