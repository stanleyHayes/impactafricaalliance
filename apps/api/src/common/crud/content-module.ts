import { type AdminResource, UserRole, type UserRole as Role } from '@iaa/shared';
import { Router } from 'express';
import type { Model } from 'mongoose';
import type { DependencyContainer } from 'tsyringe';

import { requireAuth, requirePermissionFor, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../../modules/auth/token.service.js';
import { asyncHandler } from '../async-handler.js';
import type { QueryFilter } from '../mongo-types.js';

import { ContentController, type ContentSchemas } from './content-controller.js';
import { ContentRepository, type SortSpec } from './content-repository.js';
import { ContentService, type ContentServiceOptions } from './content-service.js';

export interface ContentModuleDefinition<TDoc> {
  /** URL segment, e.g. "articles". */
  path: string;
  /** Singular resource name used in error messages, e.g. "Article". */
  resource: string;
  model: Model<TDoc>;
  schemas: ContentSchemas;
  /** When set, public single-item lookups use this field instead of the id. */
  slugField?: keyof TDoc & string;
  /** Rows visible to the public site (default: published only). */
  publicFilter?: QueryFilter<TDoc>;
  defaultSort?: SortSpec;
  /** Roles permitted to mutate content (default: Admin + Editor). */
  writeRoles?: Role[];
  /** Fields stripped from public reads but kept on the admin surface. */
  publicOmit?: (keyof TDoc & string)[];
  /** Internal tooling with no public surface, e.g. the media library. */
  adminOnly?: boolean;
  /** Optional factory to build a custom service (e.g. for domain hooks). */
  serviceFactory?: (
    repo: ContentRepository<TDoc>,
    options: ContentServiceOptions<TDoc>,
  ) => ContentService<TDoc>;
}

export interface MountedContentModule {
  path: string;
  /** Absent for admin-only modules, which the app then does not mount. */
  publicRouter?: Router;
  adminRouter: Router;
}

const DEFAULT_SORT: SortSpec = { createdAt: -1 };
const DEFAULT_PUBLIC_FILTER = { status: 'published' };
const DEFAULT_WRITE_ROLES: Role[] = [UserRole.Admin, UserRole.Editor];

/** Build the public and admin routers for a content resource from its definition. */
export const mountContentModule = <TDoc>(
  def: ContentModuleDefinition<TDoc>,
  container: DependencyContainer,
): MountedContentModule => {
  const repo = new ContentRepository<TDoc>(def.model, def.defaultSort ?? DEFAULT_SORT);
  const serviceOptions: ContentServiceOptions<TDoc> = {
    resource: def.resource,
    publicFilter: def.publicFilter ?? (DEFAULT_PUBLIC_FILTER as QueryFilter<TDoc>),
    ...(def.slugField ? { slugField: def.slugField } : {}),
  };
  const service = def.serviceFactory
    ? def.serviceFactory(repo, serviceOptions)
    : new ContentService<TDoc>(repo, serviceOptions);
  const controller = new ContentController<TDoc>(service, def.schemas, def.publicOmit ?? []);
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();
  publicRouter.get('/', asyncHandler(controller.listPublic));
  publicRouter.get('/:key', asyncHandler(controller.getPublic));

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(...(def.writeRoles ?? DEFAULT_WRITE_ROLES)));
  adminRouter.use(requirePermissionFor(def.path as AdminResource));
  adminRouter.get('/', asyncHandler(controller.listAdmin));
  adminRouter.get('/:id', asyncHandler(controller.getAdmin));
  adminRouter.post('/', asyncHandler(controller.create));
  adminRouter.patch('/:id', asyncHandler(controller.update));
  adminRouter.delete('/:id', asyncHandler(controller.remove));

  return { path: def.path, ...(def.adminOnly ? {} : { publicRouter }), adminRouter };
};
