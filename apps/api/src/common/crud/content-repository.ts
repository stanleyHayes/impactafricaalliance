import type { AnyKeys, HydratedDocument, Model, SortOrder, UpdateQuery } from 'mongoose';

import type { QueryFilter } from '../mongo-types.js';

export type SortSpec = Record<string, SortOrder>;

export interface ListResult<TDoc> {
  items: HydratedDocument<TDoc>[];
  total: number;
}

/**
 * Generic data-access layer for a content collection. One implementation,
 * configured per entity with its model and default sort — so every content
 * type gets the same battle-tested pagination and querying behaviour.
 */
export class ContentRepository<TDoc> {
  constructor(
    private readonly model: Model<TDoc>,
    private readonly defaultSort: SortSpec,
  ) {}

  async list(filter: QueryFilter<TDoc>, page: number, pageSize: number): Promise<ListResult<TDoc>> {
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(this.defaultSort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<HydratedDocument<TDoc> | null> {
    return this.model.findById(id).exec();
  }

  findOne(filter: QueryFilter<TDoc>): Promise<HydratedDocument<TDoc> | null> {
    return this.model.findOne(filter).exec();
  }

  create(data: AnyKeys<TDoc>): Promise<HydratedDocument<TDoc>> {
    return new this.model(data).save() as Promise<HydratedDocument<TDoc>>;
  }

  update(id: string, changes: UpdateQuery<TDoc>): Promise<HydratedDocument<TDoc> | null> {
    return this.model.findByIdAndUpdate(id, changes, { new: true, runValidators: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id } as QueryFilter<TDoc>).exec();
    return result.deletedCount === 1;
  }
}
