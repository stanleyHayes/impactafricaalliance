import { UserRole } from '@iaa/shared';
import { Router } from 'express';
import type { DependencyContainer } from 'tsyringe';

import { asyncHandler } from '../../common/async-handler.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import { TOKENS } from '../../tokens.js';
import { TokenService } from '../auth/token.service.js';

/** Admin-only endpoint that hands the client a signed Cloudinary upload payload. */
export const createMediaRouter = (container: DependencyContainer): Router => {
  const media = container.resolve<MediaProvider>(TOKENS.MediaProvider);
  const tokens = container.resolve(TokenService);
  const router = Router();

  router.post(
    '/sign',
    requireAuth(tokens),
    requireRole(UserRole.Admin, UserRole.Editor),
    asyncHandler(async (_req, res) => {
      res.json(media.createSignedUpload());
    }),
  );

  return router;
};
