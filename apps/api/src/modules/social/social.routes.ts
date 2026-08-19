import { socialPostInputSchema, UserRole } from '@iaa/shared';
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

  adminRouter.get(
    '/accounts',
    asyncHandler(async (_req, res) => {
      const accounts = await repository.list();
      res.json(
        accounts.map((account) => ({
          platform: account.platform,
          accountId: account.accountId,
          accountName: account.accountName,
          accountHandle: account.accountHandle,
          tokenExpiry: account.tokenExpiry,
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
