import {
  DESTINATION_CAPABILITIES,
  destinationsFor,
  needsReconnect,
  socialPostInputSchema,
  socialPreviewRequestSchema,
  socialPublishRequestSchema,
  UserRole,
  type SocialConnectionPlatform,
} from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { ValidationError } from '../../common/errors.js';
import { pathParam } from '../../common/http.js';
import { parseWith } from '../../common/validate.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { SocialPublisher } from '../../providers/social/social-publisher.js';
import { TOKENS } from '../../tokens.js';
import { TokenService } from '../auth/token.service.js';

import { SOCIAL_PLATFORMS, type SocialPlatform } from './social-account.model.js';
import { SocialAccountRepository } from './social-account.repository.js';
import { OAUTH_STATE_COOKIE, SocialOAuthService } from './social-oauth.service.js';
import { SocialPublicationService } from './social-publication.service.js';

const isSocialPlatform = (value: string): value is SocialPlatform =>
  SOCIAL_PLATFORMS.includes(value as SocialPlatform);

/** Admin and public OAuth callback routers for social account connections. */
export const createSocialRouters = (
  container: DependencyContainer,
): { adminRouter: Router; publicRouter: Router } => {
  const config = container.resolve<AppConfig>(TOKENS.Config);
  const logger = container.resolve<AppLogger>(TOKENS.Logger);
  const tokens = container.resolve(TokenService);
  const repository = container.resolve(SocialAccountRepository);
  const oauth = container.resolve(SocialOAuthService);

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin));

  adminRouter.post(
    '/posts',
    asyncHandler(async (req, res) => {
      const input = parseWith(socialPostInputSchema, req.body);
      const publisher = container.resolve(SocialPublisher);
      const results = await publisher.publishPost({
        message: input.message,
        linkUrl: input.linkUrl || undefined,
        imageUrl: input.imageUrl || undefined,
        platforms: input.platforms,
      });
      res.json({ results });
    }),
  );

  /**
   * Draft platform-specific copy without sending anything. Deterministic, so
   * the preview does not depend on an AI provider being reachable.
   */
  adminRouter.post(
    '/preview',
    asyncHandler(async (req, res) => {
      const input = parseWith(socialPreviewRequestSchema, req.body);
      const publications = container.resolve(SocialPublicationService);
      res.json({ previews: publications.preview(input.destinations, input.source) });
    }),
  );

  /**
   * Queue one publication per destination and return immediately. The worker
   * does the talking to providers, so a slow network is never the editor's
   * problem and a failure on one destination cannot undo another.
   */
  adminRouter.post(
    '/publish',
    asyncHandler(async (req, res) => {
      const input = parseWith(socialPublishRequestSchema, req.body);
      const publications = container.resolve(SocialPublicationService);
      const articleId = typeof req.body?.articleId === 'string' ? req.body.articleId : undefined;
      const queued = await publications.queue(input, {
        ...(articleId ? { articleId } : {}),
        ...(req.user?.sub ? { userId: req.user.sub } : {}),
      });
      res.status(202).json({ publications: queued });
    }),
  );

  adminRouter.get(
    '/publications',
    asyncHandler(async (req, res) => {
      const publications = container.resolve(SocialPublicationService);
      const articleId = typeof req.query.articleId === 'string' ? req.query.articleId : undefined;
      res.json({
        items: articleId
          ? await publications.listForArticle(articleId)
          : await publications.list(),
      });
    }),
  );

  adminRouter.post(
    '/publications/:id/retry',
    asyncHandler(async (req, res) => {
      const publications = container.resolve(SocialPublicationService);
      res.json(await publications.retry(pathParam(req, 'id')));
    }),
  );

  adminRouter.post(
    '/publications/:id/cancel',
    asyncHandler(async (req, res) => {
      const publications = container.resolve(SocialPublicationService);
      res.json(await publications.cancel(pathParam(req, 'id')));
    }),
  );

  adminRouter.get(
    '/accounts',
    asyncHandler(async (_req, res) => {
      const accounts = await repository.list();
      // Never the token, encrypted or otherwise: the browser has no use for it
      // and every payload it appears in is another place it can leak.
      res.json(
        accounts.map((account) => ({
          id: account.id as string,
          platform: account.platform,
          accountId: account.accountId,
          accountName: account.accountName,
          accountHandle: account.accountHandle,
          tokenExpiry: account.tokenExpiry,
          status: account.status,
          needsReconnect: needsReconnect(account.status),
          scopes: account.scopes,
          // What this one connection can actually publish to, so the dashboard
          // does not have to know that Meta covers two destinations.
          destinations: destinationsFor(account.platform as SocialConnectionPlatform).map(
            (destination) => DESTINATION_CAPABILITIES[destination],
          ),
          connectedBy: account.connectedBy,
          createdAt: account.createdAt,
        })),
      );
    }),
  );

  adminRouter.get(
    '/:platform/connect',
    asyncHandler(async (req, res) => {
      const platform = pathParam(req, 'platform');
      if (!isSocialPlatform(platform)) {
        throw new ValidationError('Unsupported social platform');
      }
      const { redirectUrl, cookie } = oauth.buildAuthorizationUrl(platform, req.user!.sub);
      res.cookie(cookie.name, cookie.value, cookie.options);
      res.redirect(redirectUrl);
    }),
  );

  adminRouter.post(
    '/:platform/disconnect',
    asyncHandler(async (req, res) => {
      const platform = pathParam(req, 'platform');
      if (!isSocialPlatform(platform)) {
        throw new ValidationError('Unsupported social platform');
      }
      await repository.deleteByPlatform(platform);
      res.status(204).send();
    }),
  );

  const publicRouter = Router();
  publicRouter.get(
    '/:platform/callback',
    asyncHandler(async (req, res) => {
      const platform = pathParam(req, 'platform');
      if (!isSocialPlatform(platform)) {
        res.redirect(`${config.adminUrl}/social-connections?error=unsupported_platform`);
        return;
      }

      try {
        await oauth.handleCallback(
          platform,
          {
            code: req.query.code as string | undefined,
            state: req.query.state as string | undefined,
          },
          req.headers.cookie,
        );
        res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
        res.redirect(`${config.adminUrl}/social-connections?connected=${platform}`);
      } catch (err) {
        logger.error({ err, platform }, 'Social OAuth callback failed');
        res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
        const message = err instanceof Error ? err.message : 'OAuth callback failed';
        res.redirect(`${config.adminUrl}/social-connections?error=${encodeURIComponent(message)}`);
      }
    }),
  );

  return { adminRouter, publicRouter };
};
