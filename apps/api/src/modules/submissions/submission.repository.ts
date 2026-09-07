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

  createSubmission(data: {
    type: SubmissionType;
    payload: Record<string, unknown>;
    consent: boolean;
    consentVersion?: string;
    consentedAt?: Date;
  }) {
    return SubmissionModel.create(data);
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

  reactivateSubscriber(id: string, consentVersion?: string, consentedAt?: Date) {
    return SubscriberModel.findByIdAndUpdate(
      id,
      { $unset: { unsubscribedAt: 1 }, consentVersion, consentedAt },
      { new: true },
    ).exec();
  }

  /**
   * Record a WhatsApp opt-in on someone who already subscribes by email.
   * A separate consent, captured and dated separately.
   */
  setWhatsappOptIn(id: string, whatsappPhone: string, whatsappOptInAt: Date) {
    return SubscriberModel.findByIdAndUpdate(
      id,
      { $set: { whatsappPhone, whatsappOptIn: true, whatsappOptInAt } },
      { new: true },
    ).exec();
  }

  /** Everyone who may lawfully be messaged on WhatsApp right now. */
  listWhatsappRecipients() {
    return SubscriberModel.find({
      whatsappOptIn: true,
      whatsappPhone: { $exists: true, $ne: null },
      unsubscribedAt: { $exists: false },
    })
      .select('whatsappPhone name')
      .exec();
  }

  unsubscribeSubscriber(email: string) {
    return SubscriberModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { unsubscribedAt: new Date() },
      { new: true },
    ).exec();
  }

  deleteSubscriber(id: string) {
    return SubscriberModel.findByIdAndDelete(id).exec();
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
