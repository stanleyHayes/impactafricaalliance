import { paginationQuerySchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import type { AnyKeys, HydratedDocument, UpdateQuery } from 'mongoose';
import { z, type ZodTypeAny } from 'zod';

import { pathParam } from '../http.js';
import type { QueryFilter } from '../mongo-types.js';
import { parseWith } from '../validate.js';

import type { ContentService } from './content-service.js';

export interface ContentSchemas {
  create: ZodTypeAny;
  update: ZodTypeAny;
}

/** Optional with no default: the field can be absent and nothing fills it in. */
const isRemovable = (field: z.ZodType): boolean => {
  try {
    const absent = field.safeParse(undefined);
    return absent.success && absent.data === undefined;
  } catch {
    // A transform that cannot take undefined: treat the field as required.
    return false;
  }
};

/**
 * Fields a record can do without, from its create schema. A required field,
 * or one with a default (a tier, a switch, an order), always has a value, so
 * a null for it stays an error.
 */
const removableFields = (create: z.ZodType): ReadonlySet<string> => {
  if (!(create instanceof z.ZodObject)) {
    return new Set();
  }
  const shape = create.shape as Record<string, z.ZodType>;
  return new Set(
    Object.entries(shape)
      .filter(([, field]) => isRemovable(field))
      .map(([key]) => key),
  );
};

/**
 * A PATCH's nulls on removable fields, taken out of the body. They are
 * handled here rather than in each update schema, which only accepts null
 * where a resource says so (and Zod 4 cannot extend a refined schema).
 */
const takeRemovals = (
  body: unknown,
  removable: ReadonlySet<string>,
): { removals: Record<string, null>; rest: unknown } => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { removals: {}, rest: body };
  }
  const fields = body as Record<string, unknown>;
  const removed = Object.keys(fields).filter((key) => fields[key] === null && removable.has(key));
  const rest = { ...fields };
  for (const key of removed) {
    delete rest[key];
  }
  return { removals: Object.fromEntries(removed.map((key) => [key, null])), rest };
};

/** Generic HTTP surface for a content resource (public reads + admin writes). */
export class ContentController<TDoc> {
  /** Fields a PATCH may remove by sending null. */
  private readonly removable: ReadonlySet<string>;

  constructor(
    private readonly service: ContentService<TDoc>,
    private readonly schemas: ContentSchemas,
    /** Fields the public API must never return, e.g. an event's joining link. */
    private readonly publicOmit: readonly string[] = [],
  ) {
    this.removable = removableFields(schemas.create);
  }

  /**
   * Public and admin reads share one service, so a field only staff may see has
   * to come off here. Serialising first keeps the payload identical to what
   * res.json would have produced on its own.
   */
  private stripPrivate = (doc: HydratedDocument<TDoc>): Record<string, unknown> => {
    const json = doc.toJSON() as Record<string, unknown>;
    for (const field of this.publicOmit) {
      delete json[field];
    }
    return json;
  };

  listPublic = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
    const result = await this.service.listPublic(page, pageSize);
    res.json({ ...result, items: result.items.map((item) => this.stripPrivate(item)) });
  };

  getPublic = async (req: Request, res: Response): Promise<void> => {
    res.json(this.stripPrivate(await this.service.getPublic(pathParam(req, 'key'))));
  };

  listAdmin = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
    const filter: QueryFilter<TDoc> = {};
    const status = req.query.status;
    if (typeof status === 'string' && status.length > 0) {
      Object.assign(filter, { status });
    }
    res.json(await this.service.listAll(filter, page, pageSize));
  };

  getAdmin = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.getById(pathParam(req, 'id')));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = parseWith(this.schemas.create, req.body) as AnyKeys<TDoc>;
    res.status(201).json(await this.service.create(data));
  };

  /** A null on a removable field means "remove it"; the service unsets it. */
  update = async (req: Request, res: Response): Promise<void> => {
    const { removals, rest } = takeRemovals(req.body, this.removable);
    const changes = parseWith(this.schemas.update, rest) as Record<string, unknown>;
    const data = { ...changes, ...removals } as UpdateQuery<TDoc>;
    res.json(await this.service.update(pathParam(req, 'id'), data));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(pathParam(req, 'id'));
    res.status(204).send();
  };
}
