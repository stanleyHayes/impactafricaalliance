import { changePasswordSchema, loginSchema, refreshSchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { UnauthorizedError } from '../../common/errors.js';
import { parseWith } from '../../common/validate.js';

import { AuthService } from './auth.service.js';

/** Translates HTTP requests into AuthService calls. */
@injectable()
export class AuthController {
  constructor(@inject(AuthService) private readonly auth: AuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(loginSchema, req.body);
    const result = await this.auth.login(input);
    res.status(200).json(result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = parseWith(refreshSchema, req.body);
    const result = await this.auth.refresh(refreshToken);
    res.status(200).json(result);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.auth.me(this.requireUserId(req));
    res.status(200).json(user);
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(changePasswordSchema, req.body);
    await this.auth.changePassword(this.requireUserId(req), input);
    res.status(204).send();
  };

  private requireUserId(req: Request): string {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    return req.user.sub;
  }
}
