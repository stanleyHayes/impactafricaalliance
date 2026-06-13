import type { SubmissionStatus, SubmissionType } from '@iaa/shared';
import { injectable } from 'tsyringe';

import type { QueryFilter } from '../../common/mongo-types.js';

import {
  SubmissionModel,
  SubscriberModel,
  type SubmissionDocument,
  type SubscriberDocument,
} from './submission.model.js';

export interface SubmissionListFilter {
  type?: SubmissionType;
  status?: SubmissionStatus;
}

@injectable()
export class SubmissionRepository {
  async listSubmissions(filter: SubmissionListFilter, page: number, pageSize: number) {
    const query: QueryFilter<SubmissionDocument> = {};
    if (filter.type) {
      query.type = filter.type;
    }
    if (filter.status) {
      query.status = filter.status;
    }
    const [items, total] = await Promise.all([
      SubmissionModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      SubmissionModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  }

  createSubmission(type: SubmissionType, payload: Record<string, unknown>) {
    return SubmissionModel.create({ type, payload });
  }

  updateStatus(id: string, status: SubmissionStatus) {
    return SubmissionModel.findByIdAndUpdate(id, { status }, { new: true }).exec();
  }

  findSubscriberByEmail(email: string) {
    return SubscriberModel.findOne({ email: email.toLowerCase() }).exec();
  }

  createSubscriber(data: Partial<SubscriberDocument>) {
    return SubscriberModel.create(data);
  }

  reactivateSubscriber(id: string) {
    return SubscriberModel.findByIdAndUpdate(
      id,
      { $unset: { unsubscribedAt: 1 } },
      { new: true },
    ).exec();
  }

  async listSubscribers(page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      SubscriberModel.find({ unsubscribedAt: { $exists: false } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      SubscriberModel.countDocuments({ unsubscribedAt: { $exists: false } }).exec(),
    ]);
    return { items, total };
  }
}
