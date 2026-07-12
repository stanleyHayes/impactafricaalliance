import { siteSettingUpdateSchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { parseWith } from '../../common/validate.js';

import { SiteSettingService } from './site-setting.service.js';

@injectable()
export class SiteSettingController {
  constructor(@inject(SiteSettingService) private readonly service: SiteSettingService) {}

  get = async (_req: Request, res: Response): Promise<void> => {
    const settings = await this.service.getOrCreate();
    res.json(settings);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(siteSettingUpdateSchema, req.body);
    const settings = await this.service.update(input);
    res.json(settings);
  };
}
