import { paginationQuerySchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import type { AnyKeys, UpdateQuery } from 'mongoose';
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
  ) {}

  listPublic = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = parseWith(paginationQuerySchema, req.query);
    res.json(await this.service.listPublic(page, pageSize));
  };

  getPublic = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.getPublic(pathParam(req, 'key')));
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
