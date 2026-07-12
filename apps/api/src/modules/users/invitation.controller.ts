import { inviteUserSchema } from '@iaa/shared';
import type { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';

import { UnauthorizedError } from '../../common/errors.js';
import { parseWith } from '../../common/validate.js';

import { InvitationService } from './invitation.service.js';

@injectable()
export class InvitationController {
  constructor(@inject(InvitationService) private readonly invitations: InvitationService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const input = parseWith(inviteUserSchema, req.body);
    const result = await this.invitations.createInvitation(input, req.user.sub);
    res.status(202).json({
      message: 'Invitation sent',
      email: result.email,
      role: result.role,
      ...(result.token ? { token: result.token } : {}),
    });
  };
}
