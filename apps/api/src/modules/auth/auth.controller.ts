import {
  acceptInvitationSchema,
  changePasswordSchema,
  disableMfaSchema,
  mfaLoginSchema,
  refreshSchema,
  setupMfaSchema,
  updateProfileSchema,
  verifyMfaSetupSchema,
} from '@iaa/shared';
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
    const input = parseWith(mfaLoginSchema, req.body);
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

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(updateProfileSchema, req.body);
    const user = await this.auth.updateProfile(this.requireUserId(req), input);
    res.status(200).json(user);
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(changePasswordSchema, req.body);
    await this.auth.changePassword(this.requireUserId(req), input);
    res.status(204).send();
  };

  getMfaStatus = async (req: Request, res: Response): Promise<void> => {
    const result = await this.auth.getMfaStatus(this.requireUserId(req));
    res.status(200).json(result);
  };

  setupMfa = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(setupMfaSchema, req.body);
    const result = await this.auth.setupMfa(this.requireUserId(req), input);
    res.status(200).json(result);
  };

  verifyMfaSetup = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(verifyMfaSetupSchema, req.body);
    const result = await this.auth.verifyMfaSetup(this.requireUserId(req), input);
    res.status(200).json(result);
  };

  disableMfa = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(disableMfaSchema, req.body);
    const result = await this.auth.disableMfa(this.requireUserId(req), input);
    res.status(200).json(result);
  };

  acceptInvitation = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(acceptInvitationSchema, req.body);
    const result = await this.auth.acceptInvitation(input);
    res.status(201).json(result);
  };

  private requireUserId(req: Request): string {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    return req.user.sub;
  }
}
