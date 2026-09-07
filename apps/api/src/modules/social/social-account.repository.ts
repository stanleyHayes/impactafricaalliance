
import type { SocialConnectionStatus } from '@iaa/shared';
import type { HydratedDocument } from 'mongoose';
import { injectable } from 'tsyringe';

import {
  SocialAccountModel,
  type SocialAccountDocument,
  type SocialPlatform,
} from './social-account.model.js';

@injectable()
export class SocialAccountRepository {
  async findByPlatform(platform: SocialPlatform): Promise<HydratedDocument<SocialAccountDocument> | null> {
    return SocialAccountModel.findOne({ platform }).exec();
  }

  async findById(id: string): Promise<HydratedDocument<SocialAccountDocument> | null> {
    return SocialAccountModel.findById(id).exec();
  }

  async list(): Promise<HydratedDocument<SocialAccountDocument>[]> {
    return SocialAccountModel.find().sort({ platform: 1 }).exec();
  }

  async upsert(
    platform: SocialPlatform,
    data: Partial<Omit<SocialAccountDocument, 'platform' | 'createdAt' | 'updatedAt'>>,
  ): Promise<HydratedDocument<SocialAccountDocument>> {
    return SocialAccountModel.findOneAndUpdate(
      { platform },
      { $set: data },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }

  /**
   * Record what the provider last told us about this connection, so the
   * dashboard can offer Reconnect instead of failing every post identically.
   */
  async setStatus(id: string, status: SocialConnectionStatus): Promise<void> {
    await SocialAccountModel.updateOne({ _id: id }, { $set: { status } }).exec();
  }

  async deleteByPlatform(platform: SocialPlatform): Promise<void> {
    await SocialAccountModel.deleteOne({ platform }).exec();
  }
}
