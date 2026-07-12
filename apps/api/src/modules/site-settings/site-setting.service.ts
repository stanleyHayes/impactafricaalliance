import type { SiteSettingUpdate } from '@iaa/shared';
import { type HydratedDocument } from 'mongoose';
import { injectable } from 'tsyringe';

import { SiteSettingModel } from './site-setting.model.js';
import type { SiteSettingDocument } from './site-setting.model.js';

const DEFAULT_SITE_KEY = 'site';

/** Default placeholder values used only when no site settings document exists yet. */
const DEFAULT_SETTINGS: Record<string, unknown> = {
  siteName: 'Impact Africa Alliance',
  tagline: 'Empowering African youth through education, skills, and opportunity.',
  contactEmail: 'hello@impactafricaalliance.org',
  contactPhone: '+233 20 000 0000',
  addressLine1: '123 Independence Avenue',
  city: 'Accra',
  region: 'Greater Accra',
  country: 'Ghana',
};

@injectable()
export class SiteSettingService {
  async getOrCreate(): Promise<HydratedDocument<SiteSettingDocument>> {
    let document = await SiteSettingModel.findOne({ key: DEFAULT_SITE_KEY }).exec();
    if (!document) {
      document = await SiteSettingModel.create({ key: DEFAULT_SITE_KEY, ...DEFAULT_SETTINGS });
    }
    return document;
  }

  async update(input: SiteSettingUpdate): Promise<HydratedDocument<SiteSettingDocument>> {
    const document = await this.getOrCreate();
    const currentSocials = document.socials;

    Object.assign(document, input);

    if (input.socials) {
      const provided = Object.fromEntries(
        Object.entries(input.socials).filter(([, value]) => value !== undefined),
      );
      document.socials = { ...(currentSocials ?? {}), ...provided } as SiteSettingDocument['socials'];
    }

    return document.save();
  }
}
