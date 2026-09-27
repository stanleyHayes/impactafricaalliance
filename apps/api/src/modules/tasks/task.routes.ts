import {
  checklistItemInputSchema,
  checklistItemPatchSchema,
  objectIdSchema,
  paginationQuerySchema,
  stableIdSchema,
  taskArchiveSchema,
  taskAttachmentInputSchema,
  taskBoardQuerySchema,
  taskCommentInputSchema,
  taskInputSchema,
  taskListQuerySchema,
  taskMoveSchema,
  taskSummaryQuerySchema,
  taskUpdateSchema,
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

import { TaskCommentService } from './task-comment.service.js';
import { TaskItemsService } from './task-items.service.js';
import { TaskQueryService } from './task-query.service.js';
import type { TaskActor } from './task-rules.js';
import { TaskService } from './task.service.js';

export interface TaskRouters {
  adminRouter: Router;
}

const idParams = z.object({ id: objectIdSchema });
// Keys are short (`IAA-42`); anything longer is neither a key nor an id.
const idOrKeyParams = z.object({ idOrKey: z.string().trim().min(1).max(40) });
const checklistParams = idParams.extend({ itemId: stableIdSchema });
const attachmentParams = idParams.extend({ attachmentId: stableIdSchema });
const commentParams = idParams.extend({ commentId: objectIdSchema });

/** The signed-in caller. `requireAuth` has run, so a missing user is a wiring fault, answered as 401. */
const actorOf = (req: Request): TaskActor => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return { id: req.user.sub, email: req.user.email, role: req.user.role };
};

/**
 * Tasks (plan §3.3), mounted at `/api/admin/tasks`.
 *
 * Staff roles only, then one permission per route, spelled out rather than
 * derived from the method: a comment is a POST but only needs
 * `tasks:update`, and assigning people is an update too (plan D2). The fixed
 * paths (`/board`, `/summary`) come before `/:idOrKey`, which would otherwise
 * read them as keys.
 */
export const createTaskRouters = (container: DependencyContainer): TaskRouters => {
  const tokens = container.resolve(TokenService);
  const reader = container.resolve(TaskQueryService);
  const tasks = container.resolve(TaskService);
  const items = container.resolve(TaskItemsService);
  const comments = container.resolve(TaskCommentService);

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  const canRead = requirePermission('tasks:read');
  const canCreate = requirePermission('tasks:create');
  const canUpdate = requirePermission('tasks:update');
  const canDelete = requirePermission('tasks:delete');

  adminRouter.get(
    '/',
    canRead,
    asyncHandler(async (req, res) => {
      const query = parseWith(taskListQuerySchema, req.query);
      res.json(await reader.list(query, actorOf(req).id));
    }),
  );

  adminRouter.get(
    '/board',
    canRead,
    asyncHandler(async (req, res) => {
      const query = parseWith(taskBoardQuerySchema, req.query);
      res.json(await reader.board(query, actorOf(req).id));
    }),
  );

  adminRouter.get(
    '/summary',
    canRead,
    asyncHandler(async (req, res) => {
      const query = parseWith(taskSummaryQuerySchema, req.query);
      res.json(await reader.summary(query, actorOf(req).id));
    }),
  );

  adminRouter.post(
    '/',
    canCreate,
    asyncHandler(async (req, res) => {
      const input = parseWith(taskInputSchema, req.body);
      res.status(201).json(await tasks.create(input, actorOf(req)));
    }),
  );

  adminRouter.get(
    '/:idOrKey',
    canRead,
    asyncHandler(async (req, res) => {
      const { idOrKey } = parseWith(idOrKeyParams, req.params);
      res.json(await reader.get(idOrKey));
    }),
  );

  adminRouter.patch(
    '/:id',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const input = parseWith(taskUpdateSchema, req.body);
      res.json(await tasks.update(id, input, actorOf(req)));
    }),
  );

  adminRouter.patch(
    '/:id/move',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const input = parseWith(taskMoveSchema, req.body);
      res.json(await tasks.move(id, input, actorOf(req)));
    }),
  );

  adminRouter.patch(
    '/:id/archive',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const { archived } = parseWith(taskArchiveSchema, req.body);
      res.json(await tasks.archive(id, archived, actorOf(req)));
    }),
  );

  adminRouter.delete(
    '/:id',
    canDelete,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      await tasks.remove(id, actorOf(req));
      res.status(204).send();
    }),
  );

  adminRouter.get(
    '/:id/activity',
    canRead,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
      res.json(await tasks.activity(id, page, pageSize));
    }),
  );

  adminRouter.post(
    '/:id/checklist',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const input = parseWith(checklistItemInputSchema, req.body);
      res.status(201).json(await items.addChecklistItem(id, input, actorOf(req)));
    }),
  );

  adminRouter.patch(
    '/:id/checklist/:itemId',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id, itemId } = parseWith(checklistParams, req.params);
      const patch = parseWith(checklistItemPatchSchema, req.body);
      res.json(await items.updateChecklistItem(id, itemId, patch, actorOf(req)));
    }),
  );

  adminRouter.delete(
    '/:id/checklist/:itemId',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id, itemId } = parseWith(checklistParams, req.params);
      res.json(await items.removeChecklistItem(id, itemId, actorOf(req)));
    }),
  );

  adminRouter.post(
    '/:id/attachments',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const input = parseWith(taskAttachmentInputSchema, req.body);
      res.status(201).json(await items.addAttachment(id, input, actorOf(req)));
    }),
  );

  adminRouter.delete(
    '/:id/attachments/:attachmentId',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id, attachmentId } = parseWith(attachmentParams, req.params);
      res.json(await items.removeAttachment(id, attachmentId, actorOf(req)));
    }),
  );

  adminRouter.get(
    '/:id/comments',
    canRead,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
      res.json(await comments.list(id, page, pageSize));
    }),
  );

  adminRouter.post(
    '/:id/comments',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const { body } = parseWith(taskCommentInputSchema, req.body);
      res.status(201).json(await comments.create(id, body, actorOf(req)));
    }),
  );

  adminRouter.patch(
    '/:id/comments/:commentId',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id, commentId } = parseWith(commentParams, req.params);
      const { body } = parseWith(taskCommentInputSchema, req.body);
      res.json(await comments.update(id, commentId, body, actorOf(req)));
    }),
  );

  adminRouter.delete(
    '/:id/comments/:commentId',
    canUpdate,
    asyncHandler(async (req, res) => {
      const { id, commentId } = parseWith(commentParams, req.params);
      await comments.remove(id, commentId, actorOf(req));
      res.status(204).send();
    }),
  );

  return { adminRouter };
};
