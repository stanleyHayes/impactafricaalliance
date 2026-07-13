import { injectable } from 'tsyringe';

import {
  SocialAccountModel,
  type SocialAccountDocument,
  type SocialPlatform,
} from './social-account.model.js';

@injectable()
export class SocialAccountRepository {
  async findByPlatform(platform: SocialPlatform): Promise<SocialAccountDocument | null> {
    return SocialAccountModel.findOne({ platform }).exec();
  }

  async list(): Promise<SocialAccountDocument[]> {
    return SocialAccountModel.find().sort({ platform: 1 }).exec();
  }

  async upsert(
    platform: SocialPlatform,
    data: Partial<Omit<SocialAccountDocument, 'platform' | 'createdAt' | 'updatedAt'>>,
  ): Promise<SocialAccountDocument> {
    return SocialAccountModel.findOneAndUpdate(
      { platform },
      { $set: data },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }

  async deleteByPlatform(platform: SocialPlatform): Promise<void> {
    await SocialAccountModel.deleteOne({ platform }).exec();
  }
}
