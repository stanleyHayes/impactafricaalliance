import {
  objectIdSchema,
  paginationQuerySchema,
  projectDetailQuerySchema,
  projectDocumentInputSchema,
  projectInputSchema,
  projectListQuerySchema,
  projectMediaInputSchema,
  projectMediaUpdateSchema,
  projectUpdateSchema,
  stableIdSchema,
  UserRole,
} from '@iaa/shared';
import { Router, type Request } from 'express';
import type { DependencyContainer } from 'tsyringe';
import { z } from 'zod';

import { asyncHandler } from '../../common/async-handler.js';
import { UnauthorizedError } from '../../common/errors.js';
import { parseWith } from '../../common/validate.js';
import { requireAuth, requirePermission, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../auth/token.service.js';

import { ProjectService, type ProjectActor } from './project.service.js';

export interface ProjectRouters {
  adminRouter: Router;
}

const projectParams = z.object({ id: objectIdSchema });
const mediaParams = z.object({ id: objectIdSchema, itemId: stableIdSchema });
const documentParams = z.object({ id: objectIdSchema, documentId: stableIdSchema });

/** The signed-in user, who is recorded as the actor on every change. */
const actorOf = (req: Request): ProjectActor => {
  if (!req.user) throw new UnauthorizedError();
  return { id: req.user.sub, email: req.user.email };
};

/**
 * Projects (plan §3.2), mounted at `/api/admin/projects`.
 *
 * Every route names its own permission rather than deriving it from the
 * method: adding a photo is a POST, but it changes an existing project, so it
 * needs `projects:update`, not `projects:create` (plan D2). Archiving is a
 * status change and needs `update`; deleting needs `delete` and is refused
 * while tasks or stories point at the project.
 */
export const createProjectRouters = (container: DependencyContainer): ProjectRouters => {
  const tokens = container.resolve(TokenService);
  const projects = container.resolve(ProjectService);

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  adminRouter.get(
    '/',
    requirePermission('projects:read'),
    asyncHandler(async (req, res) => {
      const query = parseWith(projectListQuerySchema, req.query);
      // The caller's own day, when sent, decides what is overdue (plan D6);
      // without it the service uses the server's UTC day.
      res.json(await projects.list(query, actorOf(req), query.today));
    }),
  );

  adminRouter.post(
    '/',
    requirePermission('projects:create'),
    asyncHandler(async (req, res) => {
      const input = parseWith(projectInputSchema, req.body);
      res.status(201).json(await projects.create(input, actorOf(req)));
    }),
  );

  adminRouter.get(
    '/:id',
    requirePermission('projects:read'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(projectParams, req.params);
      const { today } = parseWith(projectDetailQuerySchema, req.query);
      res.json(await projects.get(id, today));
    }),
  );

  adminRouter.patch(
    '/:id',
    requirePermission('projects:update'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(projectParams, req.params);
      const patch = parseWith(projectUpdateSchema, req.body);
      res.json(await projects.update(id, patch, actorOf(req)));
    }),
  );

  adminRouter.delete(
    '/:id',
    requirePermission('projects:delete'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(projectParams, req.params);
      await projects.remove(id, actorOf(req));
      res.status(204).end();
    }),
  );

  adminRouter.post(
    '/:id/media',
    requirePermission('projects:update'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(projectParams, req.params);
      const input = parseWith(projectMediaInputSchema, req.body);
      res.status(201).json(await projects.addMedia(id, input, actorOf(req)));
    }),
  );

  adminRouter.patch(
    '/:id/media/:itemId',
    requirePermission('projects:update'),
    asyncHandler(async (req, res) => {
      const { id, itemId } = parseWith(mediaParams, req.params);
      const patch = parseWith(projectMediaUpdateSchema, req.body);
      res.json(await projects.updateMedia(id, itemId, patch, actorOf(req)));
    }),
  );

  adminRouter.delete(
    '/:id/media/:itemId',
    requirePermission('projects:update'),
    asyncHandler(async (req, res) => {
      const { id, itemId } = parseWith(mediaParams, req.params);
      await projects.removeMedia(id, itemId, actorOf(req));
      res.status(204).end();
    }),
  );

  adminRouter.post(
    '/:id/documents',
    requirePermission('projects:update'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(projectParams, req.params);
      const input = parseWith(projectDocumentInputSchema, req.body);
      res.status(201).json(await projects.addDocument(id, input, actorOf(req)));
    }),
  );

  adminRouter.delete(
    '/:id/documents/:documentId',
    requirePermission('projects:update'),
    asyncHandler(async (req, res) => {
      const { id, documentId } = parseWith(documentParams, req.params);
      await projects.removeDocument(id, documentId, actorOf(req));
      res.status(204).end();
    }),
  );

  adminRouter.get(
    '/:id/activity',
    requirePermission('projects:read'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(projectParams, req.params);
      const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
      res.json(await projects.activity(id, page, pageSize));
    }),
  );

  return { adminRouter };
};
