import { createHash, randomBytes } from 'crypto';

import { ROLE_TEMPLATES, type InviteUserInput, type Permission, type UserRole } from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { ConflictError, NotFoundError, ValidationError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { TOKENS } from '../../tokens.js';

import { UserInvitationModel, type UserInvitationHydrated } from './invitation.model.js';
import { UserRepository } from './user.repository.js';

const INVITE_TOKEN_BYTES = 32;
const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export interface CreatedInvitation {
  email: string;
  role: UserRole;
  token?: string;
}

@injectable()
export class InvitationService {
  constructor(
    @inject(UserRepository) private readonly users: UserRepository,
    @inject(TOKENS.EmailProvider) private readonly email: EmailProvider,
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async createInvitation(
    input: InviteUserInput,
    createdBy: string,
  ): Promise<CreatedInvitation> {
    const email = input.email.toLowerCase().trim();
    const existingUser = await this.users.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const existingPending = await UserInvitationModel.findOne({
      email,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).exec();
    if (existingPending) {
      throw new ConflictError('An active invitation already exists for this email');
    }

    const permissions = input.permissions?.length
      ? input.permissions
      : ROLE_TEMPLATES[input.role];

    const token = randomBytes(INVITE_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

    await UserInvitationModel.create({
      email,
      role: input.role,
      permissions,
      tokenHash,
      expiresAt,
      createdBy,
    });

    const inviteUrl = `${this.config.adminUrl}/accept-invitation?token=${token}`;
    await this.email.send({
      to: email,
      subject: 'You are invited to join Impact Africa Alliance admin',
      html: this.buildInviteEmail(inviteUrl, input.role),
    });

    const exposeToken = !this.config.isProduction && !this.config.email.apiKey;
    if (exposeToken) {
      this.logger.info({ email, inviteUrl }, 'Invitation token generated (dev/test only)');
    }

    return { email, role: input.role, ...(exposeToken ? { token } : {}) };
  }

  async findValidInvitation(token: string): Promise<UserInvitationHydrated> {
    const tokenHash = hashToken(token);
    const invitation = await UserInvitationModel.findOne({ tokenHash }).exec();
    if (!invitation) {
      throw new NotFoundError('Invitation');
    }
    if (invitation.usedAt) {
      throw new ValidationError('Invitation has already been used');
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new ValidationError('Invitation has expired');
    }
    return invitation;
  }

  async markUsed(invitation: UserInvitationHydrated): Promise<void> {
    invitation.usedAt = new Date();
    await invitation.save();
  }

  derivePermissions(role: UserRole, overrides?: Permission[]): Permission[] {
    return overrides?.length ? overrides : ROLE_TEMPLATES[role];
  }

  private buildInviteEmail(inviteUrl: string, role: string): string {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0A0F0D;">
        <h2 style="color: #0B3D2E;">Join the Impact Africa Alliance admin console</h2>
        <p>Hello,</p>
        <p>You have been invited to join the Impact Africa Alliance admin console as a <strong>${role}</strong>. Click the button below to create your account and set your password. This link expires in 7 days and can only be used once.</p>
        <p style="margin: 28px 0;">
          <a href="${inviteUrl}" style="background: #F5B800; color: #0A0F0D; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600; display: inline-block;">Accept invitation</a>
        </p>
        <p style="font-size: 0.9rem; color: #5E6B66;">If you were not expecting this invitation, you can safely ignore this email.</p>
      </div>
    `;
  }
}
