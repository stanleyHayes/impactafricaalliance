import { UserRole, type UserRole as Role } from '@iaa/shared';
import { Router } from 'express';
import type { Model } from 'mongoose';
import type { DependencyContainer } from 'tsyringe';

import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { TokenService } from '../../modules/auth/token.service.js';
import { asyncHandler } from '../async-handler.js';
import type { QueryFilter } from '../mongo-types.js';

import { ContentController, type ContentSchemas } from './content-controller.js';
import { ContentRepository, type SortSpec } from './content-repository.js';
import { ContentService } from './content-service.js';

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
}

export interface MountedContentModule {
  path: string;
  publicRouter: Router;
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
  const service = new ContentService<TDoc>(repo, {
    resource: def.resource,
    publicFilter: def.publicFilter ?? (DEFAULT_PUBLIC_FILTER as QueryFilter<TDoc>),
    ...(def.slugField ? { slugField: def.slugField } : {}),
  });
  const controller = new ContentController<TDoc>(service, def.schemas);
  const tokens = container.resolve(TokenService);

  const publicRouter = Router();
  publicRouter.get('/', asyncHandler(controller.listPublic));
  publicRouter.get('/:key', asyncHandler(controller.getPublic));

  const adminRouter = Router();
  adminRouter.use(requireAuth(tokens), requireRole(...(def.writeRoles ?? DEFAULT_WRITE_ROLES)));
  adminRouter.get('/', asyncHandler(controller.listAdmin));
  adminRouter.get('/:id', asyncHandler(controller.getAdmin));
  adminRouter.post('/', asyncHandler(controller.create));
  adminRouter.patch('/:id', asyncHandler(controller.update));
  adminRouter.delete('/:id', asyncHandler(controller.remove));

  return { path: def.path, publicRouter, adminRouter };
};
