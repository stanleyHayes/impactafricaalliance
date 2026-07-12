import type { PrivacyRequestStatus, PrivacyRequestType } from '@iaa/shared';
import { injectable } from 'tsyringe';

import type { QueryFilter } from '../../common/mongo-types.js';

import { PrivacyRequestModel, type PrivacyRequestDocument } from './privacy-request.model.js';

export interface PrivacyRequestListFilter {
  status?: PrivacyRequestStatus;
  type?: PrivacyRequestType;
}

@injectable()
export class PrivacyRequestRepository {
  async create(
    data: Omit<PrivacyRequestDocument, 'id' | 'createdAt' | 'updatedAt' | 'verificationToken'>,
  ): Promise<PrivacyRequestDocument> {
    return PrivacyRequestModel.create(data);
  }

  async findById(id: string): Promise<PrivacyRequestDocument | null> {
    return PrivacyRequestModel.findById(id).exec();
  }

  async list(
    filter: PrivacyRequestListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: PrivacyRequestDocument[]; total: number }> {
    const query: QueryFilter<PrivacyRequestDocument> = {};
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    const [items, total] = await Promise.all([
      PrivacyRequestModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      PrivacyRequestModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  }

  async update(
    id: string,
    changes: Partial<PrivacyRequestDocument>,
  ): Promise<PrivacyRequestDocument | null> {
    return PrivacyRequestModel.findByIdAndUpdate(id, changes, { new: true }).exec();
  }
}
