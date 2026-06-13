import type { CreateDonationInput, DonationStatus } from '@iaa/shared';
import { injectable } from 'tsyringe';

import { DonationModel, type DonationDocument } from './donation.model.js';

export interface NewDonation extends Pick<
  CreateDonationInput,
  'provider' | 'frequency' | 'donorName' | 'donorEmail'
> {
  reference: string;
  amountUsd: number;
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
    return DonationModel.findByIdAndUpdate(id, { reference }, { new: true }).exec();
  }

  setStatus(reference: string, status: DonationStatus) {
    return DonationModel.findOneAndUpdate({ reference }, { status }, { new: true }).exec();
  }

  async list(
    page: number,
    pageSize: number,
  ): Promise<{ items: DonationDocument[]; total: number }> {
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
