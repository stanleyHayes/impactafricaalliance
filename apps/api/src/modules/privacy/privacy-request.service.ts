import type { Paginated, PrivacyRequestInput, UpdatePrivacyRequestInput } from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { NotFoundError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import { DonationModel } from '../payments/donation.model.js';
import { SubmissionModel, SubscriberModel } from '../submissions/submission.model.js';

import { PrivacyRequestModel } from './privacy-request.model.js';
import type { PrivacyRequestDocument } from './privacy-request.model.js';
import {
  PrivacyRequestRepository,
  type PrivacyRequestListFilter,
} from './privacy-request.repository.js';

interface PersonalDataExport {
  email: string;
  submissions: Array<{
    type: string;
    status: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  subscriptions: Array<{
    email: string;
    source?: string;
    consentedAt?: string;
    unsubscribedAt?: string;
  }>;
  donations: Array<{ reference: string; amountUsd: number; status: string; createdAt: string }>;
}

@injectable()
export class PrivacyRequestService {
  constructor(@inject(PrivacyRequestRepository) private readonly repo: PrivacyRequestRepository) {}

  async create(input: PrivacyRequestInput): Promise<PrivacyRequestDocument> {
    return this.repo.create({
      email: input.email,
      type: input.type,
      details: input.details,
      status: 'pending',
    });
  }

  async list(
    filter: PrivacyRequestListFilter,
    page: number,
    pageSize: number,
  ): Promise<Paginated<PrivacyRequestDocument>> {
    const { items, total } = await this.repo.list(filter, page, pageSize);
    return paginate(items, total, page, pageSize);
  }

  async remove(id: string): Promise<void> {
    if (!(await PrivacyRequestModel.findByIdAndDelete(id).exec()))
      throw new NotFoundError('Privacy request');
  }

  async update(id: string, input: UpdatePrivacyRequestInput): Promise<PrivacyRequestDocument> {
    const request = await this.repo.findById(id);
    if (!request) {
      throw new NotFoundError('Privacy request');
    }

    const changes: Partial<PrivacyRequestDocument> = {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    };

    if (input.status === 'fulfilled' && request.status !== 'fulfilled') {
      changes.fulfilledAt = new Date();
      if (request.type === 'delete') {
        await this.erasePersonalData(request.email);
      } else if (request.type === 'access') {
        // Nothing to store; the export is provided to the admin offline.
      }
    }

    const updated = await this.repo.update(id, changes);
    if (!updated) {
      throw new NotFoundError('Privacy request');
    }
    return updated;
  }

  async exportPersonalData(email: string): Promise<PersonalDataExport> {
    const [submissions, subscribers, donations] = await Promise.all([
      SubmissionModel.find({ 'payload.email': email.toLowerCase() })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      SubscriberModel.find({ email: email.toLowerCase() }).lean().exec(),
      DonationModel.find({ donorEmail: email.toLowerCase() }).sort({ createdAt: -1 }).lean().exec(),
    ]);

    return {
      email,
      submissions: submissions.map((doc) => ({
        type: doc.type,
        status: doc.status,
        payload: doc.payload,
        createdAt: doc.createdAt.toISOString(),
      })),
      subscriptions: subscribers.map((doc) => ({
        email: doc.email,
        source: doc.source,
        consentedAt: doc.consentedAt?.toISOString(),
        unsubscribedAt: doc.unsubscribedAt?.toISOString(),
      })),
      donations: donations.map((doc) => ({
        reference: doc.reference,
        amountUsd: doc.amountUsd,
        status: doc.status,
        createdAt: doc.createdAt.toISOString(),
      })),
    };
  }

  private async erasePersonalData(email: string): Promise<void> {
    const normalized = email.toLowerCase();
    await Promise.all([
      SubmissionModel.deleteMany({ 'payload.email': normalized }).exec(),
      SubscriberModel.deleteMany({ email: normalized }).exec(),
      DonationModel.updateMany(
        { donorEmail: normalized },
        {
          $set: { donorName: '[redacted]', donorEmail: '[redacted]', marketingConsent: false },
        },
      ).exec(),
    ]);
  }
}
