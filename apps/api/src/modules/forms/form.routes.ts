import {
  DRAFT_TOKEN_HEADER,
  draftCreateSchema,
  draftSaveSchema,
  draftSubmitSchema,
  formArchiveSchema,
  formCreateSchema,
  formListQuerySchema,
  formStatusChangeSchema,
  formUpdateSchema,
  objectIdSchema,
  PREVIEW_TOKEN_HEADER,
  resumeLinkSchema,
  uploadSignSchema,
  UserRole,
} from '@iaa/shared';
import { Router, type Request } from 'express';
import type { DependencyContainer } from 'tsyringe';
import { z } from 'zod';

import { asyncHandler } from '../../common/async-handler.js';
import { parseWith } from '../../common/validate.js';
import { requireAuth, requirePermission, requireRole } from '../../middleware/auth.middleware.js';
import {
  formDraftRateLimit,
  formSubmitRateLimit,
  formUploadRateLimit,
  resumeLinkRateLimit,
} from '../../middleware/rate-limit.js';
import { TokenService } from '../auth/token.service.js';

import { ApplicantService } from './applicant.service.js';
import { actorOf } from './form-mappers.js';
import { FormService } from './form.service.js';

export interface FormRouters {
  publicRouter: Router;
  adminRouter: Router;
}

const idParams = z.object({ id: objectIdSchema });

// Deliberately loose: an address that could never exist is simply not found,
// which is what the applicant's page expects, rather than a 400.
const slugParams = z.object({ slug: z.string().trim().min(1).max(120) });

const draftToken = (req: Request): string | undefined => req.get(DRAFT_TOKEN_HEADER);

/**
 * Forms (plan §3.4): the public applicant endpoints at `/api/forms` and the
 * builder at `/api/admin/forms`.
 *
 * Public routes are unauthenticated and each has its own limiter (plan D9),
 * never the shared login bucket. A draft is reached only with its token in
 * the `x-draft-token` header. `/preview` is declared before `/:slug`, which
 * would otherwise swallow it.
 *
 * Admin routes sit behind the Admin/Editor preamble and each guards its own
 * permission, because a POST action such as duplicate would otherwise demand
 * `create` by method alone. Publishing, closing and reopening also need the
 * Admin role, checked in `FormService.changeStatus` so the refusal can say so.
 */
export const createFormRouters = (container: DependencyContainer): FormRouters => {
  const tokens = container.resolve(TokenService);
  const forms = container.resolve(FormService);
  const applicants = container.resolve(ApplicantService);

  const publicRouter = Router();

  publicRouter.get(
    '/preview',
    asyncHandler(async (req, res) => {
      res.json(await applicants.previewForm(req.get(PREVIEW_TOKEN_HEADER)));
    }),
  );

  publicRouter.get(
    '/:slug',
    asyncHandler(async (req, res) => {
      const { slug } = parseWith(slugParams, req.params);
      res.json(await applicants.publicForm(slug));
    }),
  );

  publicRouter.post(
    '/:slug/draft',
    formDraftRateLimit,
    asyncHandler(async (req, res) => {
      const { slug } = parseWith(slugParams, req.params);
      const input = parseWith(draftCreateSchema, req.body ?? {});
      res.status(201).json(await applicants.createDraft(slug, input));
    }),
  );

  publicRouter.get(
    '/:slug/draft',
    formDraftRateLimit,
    asyncHandler(async (req, res) => {
      const { slug } = parseWith(slugParams, req.params);
      res.json(await applicants.readDraft(slug, draftToken(req)));
    }),
  );

  publicRouter.patch(
    '/:slug/draft',
    formDraftRateLimit,
    asyncHandler(async (req, res) => {
      const { slug } = parseWith(slugParams, req.params);
      const input = parseWith(draftSaveSchema, req.body);
      res.json(await applicants.saveDraft(slug, draftToken(req), input));
    }),
  );

  publicRouter.post(
    '/:slug/draft/uploads/sign',
    formUploadRateLimit,
    asyncHandler(async (req, res) => {
      const { slug } = parseWith(slugParams, req.params);
      const input = parseWith(uploadSignSchema, req.body);
      res.json(await applicants.signUpload(slug, draftToken(req), input));
    }),
  );

  publicRouter.post(
    '/:slug/draft/submit',
    formSubmitRateLimit,
    asyncHandler(async (req, res) => {
      const { slug } = parseWith(slugParams, req.params);
      const input = parseWith(draftSubmitSchema, req.body ?? {});
      res.status(201).json(await applicants.submit(slug, draftToken(req), input));
    }),
  );

  publicRouter.post(
    '/:slug/draft/resume-link',
    resumeLinkRateLimit,
    asyncHandler(async (req, res) => {
      const { slug } = parseWith(slugParams, req.params);
      const input = parseWith(resumeLinkSchema, req.body);
      await applicants.requestResumeLink(slug, draftToken(req), input);
      // The same answer whatever happened, so it never says whether a draft exists.
      res.status(202).json({
        message: 'If that application is still in progress, a link is on its way.',
      });
    }),
  );

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(UserRole.Admin, UserRole.Editor));

  adminRouter.get(
    '/',
    requirePermission('forms:read'),
    asyncHandler(async (req, res) => {
      res.json(await forms.list(parseWith(formListQuerySchema, req.query)));
    }),
  );

  adminRouter.post(
    '/',
    requirePermission('forms:create'),
    asyncHandler(async (req, res) => {
      const input = parseWith(formCreateSchema, req.body);
      res.status(201).json(await forms.create(input, actorOf(req)));
    }),
  );

  adminRouter.get(
    '/:id',
    requirePermission('forms:read'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      res.json(await forms.get(id));
    }),
  );

  adminRouter.patch(
    '/:id',
    requirePermission('forms:update'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const input = parseWith(formUpdateSchema, req.body);
      res.json(await forms.update(id, input, actorOf(req)));
    }),
  );

  adminRouter.patch(
    '/:id/status',
    requirePermission('forms:update'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const { status } = parseWith(formStatusChangeSchema, req.body);
      res.json(await forms.changeStatus(id, status, actorOf(req)));
    }),
  );

  adminRouter.patch(
    '/:id/archive',
    requirePermission('forms:update'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      const { archived } = parseWith(formArchiveSchema, req.body);
      res.json(await forms.setArchived(id, archived, actorOf(req)));
    }),
  );

  adminRouter.post(
    '/:id/duplicate',
    requirePermission('forms:create'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      res.status(201).json(await forms.duplicate(id, actorOf(req)));
    }),
  );

  adminRouter.post(
    '/:id/preview',
    requirePermission('forms:read'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      res.json(await forms.preview(id));
    }),
  );

  adminRouter.delete(
    '/:id',
    requirePermission('forms:delete'),
    asyncHandler(async (req, res) => {
      const { id } = parseWith(idParams, req.params);
      await forms.remove(id, actorOf(req));
      res.status(204).end();
    }),
  );

  return { publicRouter, adminRouter };
};
