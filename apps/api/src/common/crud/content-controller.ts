import { paginationQuerySchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import type { AnyKeys, HydratedDocument, UpdateQuery } from 'mongoose';
import type { ZodTypeAny } from 'zod';

import { pathParam } from '../http.js';
import type { QueryFilter } from '../mongo-types.js';
import { parseWith } from '../validate.js';

import type { ContentService } from './content-service.js';

export interface ContentSchemas {
  create: ZodTypeAny;
  update: ZodTypeAny;
}

/** Generic HTTP surface for a content resource (public reads + admin writes). */
export class ContentController<TDoc> {
  constructor(
    private readonly service: ContentService<TDoc>,
    private readonly schemas: ContentSchemas,
    /** Fields the public API must never return, e.g. an event's joining link. */
    private readonly publicOmit: readonly string[] = [],
  ) {}

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

  update = async (req: Request, res: Response): Promise<void> => {
    const data = parseWith(this.schemas.update, req.body) as UpdateQuery<TDoc>;
    res.json(await this.service.update(pathParam(req, 'id'), data));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.service.remove(pathParam(req, 'id'));
    res.status(204).send();
  };
}
