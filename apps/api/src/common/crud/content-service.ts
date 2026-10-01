import type { Paginated } from '@iaa/shared';
import type { AnyKeys, HydratedDocument, UpdateQuery } from 'mongoose';

import { NotFoundError } from '../errors.js';
import type { QueryFilter } from '../mongo-types.js';
import { paginate } from '../pagination.js';

import type { ContentRepository } from './content-repository.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * Nulls in a plain change object become `$unset`, so a removed field is
 * absent, like one never set, rather than a stored null. An update already
 * written with operators ($set, $unset…) is passed on untouched.
 */
const unsetNulls = <TDoc>(changes: UpdateQuery<TDoc>): UpdateQuery<TDoc> => {
  const keys = Object.keys(changes);
  const removed = keys.filter((key) => changes[key] === null);
  if (!removed.length || keys.some((key) => key.startsWith('$'))) {
    return changes;
  }
  const set = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== null));
  return {
    ...(Object.keys(set).length ? { $set: set } : {}),
    $unset: Object.fromEntries(removed.map((key) => [key, 1])),
  } as UpdateQuery<TDoc>;
};

export interface ContentServiceOptions<TDoc> {
  /** Human-readable name used in 404 messages, e.g. "Article". */
  resource: string;
  /** Filter that defines "publicly visible" rows (default: published only). */
  publicFilter: QueryFilter<TDoc>;
  /** Field used for public slug lookups; omit for id-only resources. */
  slugField?: keyof TDoc & string;
}

/**
 * Generic content workflow layer. Separates the public surface (only published
 * rows, slug lookups) from the admin surface (full visibility and mutations).
 */
export class ContentService<TDoc> {
  constructor(
    private readonly repo: ContentRepository<TDoc>,
    private readonly options: ContentServiceOptions<TDoc>,
  ) {}

  async listPublic(page: number, pageSize: number): Promise<Paginated<HydratedDocument<TDoc>>> {
    const { items, total } = await this.repo.list(this.options.publicFilter, page, pageSize);
    return paginate(items, total, page, pageSize);
  }

  async listAll(
    filter: QueryFilter<TDoc>,
    page: number,
    pageSize: number,
  ): Promise<Paginated<HydratedDocument<TDoc>>> {
    const { items, total } = await this.repo.list(filter, page, pageSize);
    return paginate(items, total, page, pageSize);
  }

  /** Look up a single published row by slug (preferred) or id, for the public site. */
  async getPublic(key: string): Promise<HydratedDocument<TDoc>> {
    const slugField = this.options.slugField;
    const baseFilter = slugField
      ? ({ [slugField]: key } as QueryFilter<TDoc>)
      : ({ _id: this.asObjectId(key) } as QueryFilter<TDoc>);
    const doc = await this.repo.findOne({
      ...baseFilter,
      ...this.options.publicFilter,
    } as QueryFilter<TDoc>);
    return this.ensure(doc);
  }

  async getById(id: string): Promise<HydratedDocument<TDoc>> {
    return this.ensure(await this.repo.findById(id));
  }

  create(data: AnyKeys<TDoc>): Promise<HydratedDocument<TDoc>> {
    return this.repo.create(data);
  }

  async update(id: string, changes: UpdateQuery<TDoc>): Promise<HydratedDocument<TDoc>> {
    return this.ensure(await this.repo.update(id, unsetNulls(changes)));
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError(this.options.resource);
    }
  }

  private ensure(doc: HydratedDocument<TDoc> | null): HydratedDocument<TDoc> {
    if (!doc) {
      throw new NotFoundError(this.options.resource);
    }
    return doc;
  }

  private asObjectId(key: string): string {
    if (!OBJECT_ID.test(key)) {
      throw new NotFoundError(this.options.resource);
    }
    return key;
  }
}
