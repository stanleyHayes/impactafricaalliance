import { createHash, randomBytes } from 'crypto';

import type { ResetPasswordInput } from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { ValidationError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { TOKENS } from '../../tokens.js';
import { UserRepository } from '../users/user.repository.js';

import { PasswordService } from './password.service.js';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

@injectable()
export class PasswordResetService {
  // eslint-disable-next-line max-params
  constructor(
    @inject(UserRepository) private readonly users: UserRepository,
    @inject(PasswordService) private readonly passwords: PasswordService,
    @inject(TOKENS.EmailProvider) private readonly email: EmailProvider,
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async requestReset(email: string): Promise<{ email: string; token?: string }> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      this.logger.info({ email }, 'Password reset requested for unknown email');
      return { email };
    }

    const token = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.users.setPasswordResetToken(user.id, tokenHash, expiresAt);

    const resetUrl = `${this.config.adminUrl}/reset-password?token=${token}`;
    await this.email.send({
      to: user.email,
      subject: 'Reset your Impact Africa Alliance admin password',
      html: this.buildResetEmail(resetUrl, user.name),
    });

    // In local dev/test without an email provider, return the plaintext token so the
    // flow can be exercised without a real mailbox. Never expose this in production.
    const exposeToken = !this.config.isProduction && !this.config.email.apiKey;
    if (exposeToken) {
      this.logger.info({ email, resetUrl }, 'Password reset token generated (dev/test only)');
    }
    return { email, ...(exposeToken ? { token } : {}) };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashToken(input.token);
    const user = await this.users.findByPasswordResetTokenHash(tokenHash);

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new ValidationError('Reset token is invalid or has expired');
    }

    const passwordHash = await this.passwords.hash(input.password);
    await this.users.setPasswordHash(user.id, passwordHash);
    await this.users.clearPasswordResetToken(user.id);
  }

  private buildResetEmail(resetUrl: string, name: string): string {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0A0F0D;">
        <h2 style="color: #0B3D2E;">Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset the password for your Impact Africa Alliance admin account. Click the button below to choose a new password. This link expires in 1 hour.</p>
        <p style="margin: 28px 0;">
          <a href="${resetUrl}" style="background: #F5B800; color: #0A0F0D; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600; display: inline-block;">Reset password</a>
        </p>
        <p style="font-size: 0.9rem; color: #5E6B66;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `;
  }
}
