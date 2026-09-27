import {
  impactStoryInputSchema,
  impactStoryListQuerySchema,
  impactStoryStatusChangeSchema,
  impactStoryUpdateSchema,
  objectIdSchema,
  PREVIEW_TOKEN_HEADER,
  publicImpactStoryQuerySchema,
  slugSchema,
  UserRole,
} from '@iaa/shared';
import { Router, type Request } from 'express';
import type { DependencyContainer } from 'tsyringe';
import { z } from 'zod';

import { asyncHandler } from '../../common/async-handler.js';
import { UnauthorizedError } from '../../common/errors.js';
import { pathParam } from '../../common/http.js';
import { parseWith } from '../../common/validate.js';
import { requireAuth, requirePermission, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { ImpactStoryService, type StoryActor } from './impact-story.service.js';

export interface ImpactStoryRouters {
  publicRouter: Router;
  adminRouter: Router;
}

// Short, like the other public content: a story taken down leaves caches
// within a minute, and the story list is fetched on every visit to the page.
const PUBLIC_CACHE = 'public, max-age=60';

// A signed preview token is a few hundred characters; anything far longer is
// not one, and is refused before it reaches the verifier.
const previewHeaderSchema = z.object({ token: z.string().trim().max(4096).optional() });

/** The caller, from the verified access token and never from the request body (plan D16). */
const actorFrom = (req: Request): StoryActor => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return {
    id: req.user.sub,
    email: req.user.email,
    isAdmin: req.user.role === UserRole.Admin,
  };
};

const idParam = (req: Request, name = 'id'): string =>
  parseWith(objectIdSchema, pathParam(req, name));

/**
 * Impact stories (plan §3.5): published stories at `/api/impact-stories` and
 * the editor at `/api/admin/impact-stories`.
 *
 * Every admin route names its own permission rather than deriving one from the
 * method, because `POST /from-project` and `POST /:id/preview` are not
 * "create" in the usual sense. Publishing, unpublishing, archiving and
 * editing a live story also need the Admin role; the service checks that,
 * because which moves need it depends on the story's current status.
 */
export const createImpactStoryRouters = (container: DependencyContainer): ImpactStoryRouters => {
  const tokens = container.resolve(TokenService);
  const stories = container.resolve(ImpactStoryService);

  const publicRouter = Router();

  publicRouter.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = parseWith(publicImpactStoryQuerySchema, req.query);
      const page = await stories.publicList(query);
      // Set only on success, so a refusal is never held in a shared cache.
      res.set('Cache-Control', PUBLIC_CACHE);
      res.json(page);
    }),
  );

  // Before `/:slug`, which would otherwise read "preview" as a story's address.
  publicRouter.get(
    '/preview',
    asyncHandler(async (req, res) => {
      const { token } = parseWith(previewHeaderSchema, { token: req.get(PREVIEW_TOKEN_HEADER) });
      // A draft must never sit in a shared cache or a search index.
      res.set('Cache-Control', 'private, no-store');
      res.set('X-Robots-Tag', 'noindex, nofollow');
      res.json(await stories.previewByToken(token));
    }),
  );

  publicRouter.get(
    '/:slug',
    asyncHandler(async (req, res) => {
      const slug = parseWith(slugSchema, pathParam(req, 'slug'));
      const story = await stories.publicBySlug(slug);
      // Only a found story is cached: a 404 cached for a minute would hide a
      // story that is published a moment later.
      res.set('Cache-Control', PUBLIC_CACHE);
      res.json(story);
    }),
  );

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  adminRouter.get(
    '/',
    requirePermission('impact-stories:read'),
    asyncHandler(async (req, res) => {
      res.json(await stories.list(parseWith(impactStoryListQuerySchema, req.query)));
    }),
  );

  adminRouter.post(
    '/',
    requirePermission('impact-stories:create'),
    asyncHandler(async (req, res) => {
      const input = parseWith(impactStoryInputSchema, req.body);
      res.status(201).json(await stories.create(input, actorFrom(req)));
    }),
  );

  // Reads the project as well as creating a story, so it needs both.
  adminRouter.post(
    '/from-project/:projectId',
    requirePermission('impact-stories:create', 'projects:read'),
    asyncHandler(async (req, res) => {
      const projectId = idParam(req, 'projectId');
      res.status(201).json(await stories.createFromProject(projectId, actorFrom(req)));
    }),
  );

  adminRouter.get(
    '/:id',
    requirePermission('impact-stories:read'),
    asyncHandler(async (req, res) => {
      res.json(await stories.get(idParam(req)));
    }),
  );

  adminRouter.patch(
    '/:id',
    requirePermission('impact-stories:update'),
    asyncHandler(async (req, res) => {
      const id = idParam(req);
      const patch = parseWith(impactStoryUpdateSchema, req.body);
      res.json(await stories.update(id, patch, actorFrom(req)));
    }),
  );

  adminRouter.patch(
    '/:id/status',
    requirePermission('impact-stories:update'),
    asyncHandler(async (req, res) => {
      const id = idParam(req);
      const { status } = parseWith(impactStoryStatusChangeSchema, req.body);
      res.json(await stories.changeStatus(id, status, actorFrom(req)));
    }),
  );

  adminRouter.post(
    '/:id/preview',
    requirePermission('impact-stories:read'),
    asyncHandler(async (req, res) => {
      res.json(await stories.previewLink(idParam(req)));
    }),
  );

  adminRouter.delete(
    '/:id',
    requirePermission('impact-stories:delete'),
    asyncHandler(async (req, res) => {
      await stories.remove(idParam(req), actorFrom(req));
      res.status(204).end();
    }),
  );

  return { publicRouter, adminRouter };
};
