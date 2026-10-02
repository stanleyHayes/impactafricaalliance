import {
  DonationStatus,
  PaymentProvider,
  type CreateDonationInput,
  type DonationCurrency,
} from '@iaa/shared';
import type { HydratedDocument } from 'mongoose';
import { injectable } from 'tsyringe';

import { DonationModel, type DonationDocument } from './donation.model.js';

export interface NewDonation extends Pick<
  CreateDonationInput,
  'provider' | 'frequency' | 'donorName' | 'donorEmail' | 'marketingConsent'
> {
  reference: string;
  amount: number;
  currency: DonationCurrency;
}

@injectable()
export class DonationRepository {
  create(data: NewDonation) {
    return DonationModel.create(data);
  }

  findByReference(reference: string) {
    return DonationModel.findOne({ reference }).exec();
  }

  setReference(id: string, reference: string) {
    return DonationModel.findByIdAndUpdate(id, { reference }, { returnDocument: 'after' }).exec();
  }

  /**
   * Note that Paystack was just asked about a gift. Only `lastCheckedAt` moves: the gift itself
   * has not changed, and `updatedAt` is what the retention purge measures from.
   */
  recordCheck(id: string, at: Date) {
    return DonationModel.updateOne(
      { _id: id },
      { $set: { lastCheckedAt: at } },
      { timestamps: false },
    ).exec();
  }

  /**
   * The Paystack gifts due a look from the hourly check: those still pending, and those failed
   * but started after `failedAfter`, since a declined first try can still be paid. A gift is due
   * once nothing has looked at it since `lookedBefore`, its start counting as the first look. The
   * longest unlooked-at come first, so a gift looked at before (a donor back from an unfinished
   * checkout) takes its turn by age among new ones, not behind every one of them.
   */
  async dueForPaystackCheck(lookedBefore: Date, failedAfter: Date, limit: number) {
    const due = await DonationModel.aggregate<DonationDocument>([
      {
        $match: {
          provider: PaymentProvider.Paystack,
          $or: [
            { status: DonationStatus.Pending },
            { status: DonationStatus.Failed, createdAt: { $gt: failedAfter } },
          ],
        },
      },
      { $addFields: { lastLook: { $ifNull: ['$lastCheckedAt', '$createdAt'] } } },
      { $match: { lastLook: { $lte: lookedBefore } } },
      { $sort: { lastLook: 1, _id: 1 } },
      { $limit: limit },
      { $project: { lastLook: 0 } },
    ]).exec();
    return due.map((gift) => DonationModel.hydrate(gift));
  }

  /**
   * Transition a donation to a terminal status, but ONLY from `Pending`. This makes webhook
   * handling idempotent and prevents a replayed or out-of-order event (e.g. a late
   * `charge.failed`) from downgrading an already-confirmed `Succeeded` donation. Returns the
   * updated document, or `null` if the donation was already in a terminal state (no-op).
   * A verified success goes through `markSucceeded` instead.
   */
  setStatus(reference: string, status: DonationStatus) {
    return DonationModel.findOneAndUpdate(
      { reference, status: DonationStatus.Pending },
      { status },
      { returnDocument: 'after' },
    ).exec();
  }

  /**
   * Record a gateway-verified success, from `Pending` or from `Failed` (a declined first try, or
   * a checkout seen as abandoned and paid afterwards). Nothing moves a `Succeeded` gift, so a
   * repeat is a no-op and returns `null`; the filter makes concurrent confirmations race safely.
   */
  markSucceeded(reference: string) {
    return DonationModel.findOneAndUpdate(
      { reference, status: { $in: [DonationStatus.Pending, DonationStatus.Failed] } },
      { status: DonationStatus.Succeeded },
      { returnDocument: 'after' },
    ).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await DonationModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  async list(
    page: number,
    pageSize: number,
  ): Promise<{ items: HydratedDocument<DonationDocument>[]; total: number }> {
    const [items, total] = await Promise.all([
      DonationModel.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      DonationModel.countDocuments().exec(),
    ]);
    return { items, total };
  }
}
