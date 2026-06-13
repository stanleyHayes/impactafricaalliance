import { aiAssistSchema } from '@iaa/shared';
import type { Request, Response } from 'express';

import { parseWith } from '../../common/validate.js';

import type { AiAssistService } from './ai.service.js';

/** Translates HTTP requests into AiAssistService calls. */
export class AiController {
  constructor(private readonly ai: AiAssistService) {}

  assist = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(aiAssistSchema, req.body);
    const result = await this.ai.assist(input);
    res.status(200).json({ result });
  };
}
