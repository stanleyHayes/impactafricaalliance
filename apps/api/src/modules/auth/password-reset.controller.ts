import { forgotPasswordSchema, resetPasswordSchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { parseWith } from '../../common/validate.js';

import { PasswordResetService } from './password-reset.service.js';

@injectable()
export class PasswordResetController {
  constructor(@inject(PasswordResetService) private readonly service: PasswordResetService) {}

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(forgotPasswordSchema, req.body);
    const result = await this.service.requestReset(input.email);
    res.status(202).json({
      message: 'If the email exists, a reset link has been sent',
      email: result.email,
      ...(result.token ? { token: result.token } : {}),
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(resetPasswordSchema, req.body);
    await this.service.resetPassword(input);
    res.status(204).send();
  };
}
