import {
  ROLE_TEMPLATES,
  type AcceptInvitationInput,
  type ChangePasswordInput,
  type DisableMfaInput,
  type LoginInput,
  type LoginResponse,
  type MfaLoginInput,
  type MfaRequiredResponse,
  type MfaSetupResponse,
  type MfaStatusResponse,
  type MfaVerifySetupResponse,
  type Permission,
  type PublicUser,
  type SetupMfaInput,
  type UpdateProfileInput,
  type VerifyMfaSetupInput,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../common/errors.js';
import { InvitationService } from '../users/invitation.service.js';
import { toPublicUser, type UserHydrated } from '../users/user.model.js';
import { UserRepository } from '../users/user.repository.js';

import { MfaService } from './mfa.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

/** Authentication workflows: login, token refresh, password change. */
@injectable()
export class AuthService {
  // eslint-disable-next-line max-params
  constructor(
    @inject(UserRepository) private readonly users: UserRepository,
    @inject(TokenService) private readonly tokens: TokenService,
    @inject(PasswordService) private readonly passwords: PasswordService,
    @inject(MfaService) private readonly mfa: MfaService,
    @inject(InvitationService) private readonly invitations: InvitationService,
  ) {}

  async login(input: LoginInput | MfaLoginInput): Promise<LoginResponse | MfaRequiredResponse> {
    const user = await this.users.findByEmail(input.email);
    // Always run a comparison to keep timing consistent for unknown emails.
    const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv';
    const passwordMatches = await this.passwords.compare(input.password, hash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('This account has been deactivated');
    }

    const mfaCode = 'totpCode' in input ? input.totpCode : undefined;

    if (user.mfaEnabled) {
      if (!mfaCode) {
        return { mfaRequired: true, email: user.email };
      }
      const verified = await this.verifyMfaCode(user, mfaCode);
      if (!verified) {
        throw new UnauthorizedError('Invalid MFA code');
      }
    }

    const permissions = this.resolvePermissions(user);
    const tokenPair = this.tokens.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
    });
    await this.persistRefreshToken(user.id, tokenPair.refreshToken, tokenPair.family);

    return { user: toPublicUser(user), tokens: tokenPair };
  }

  private async verifyMfaCode(user: UserHydrated, code: string): Promise<boolean> {
    if (!user.mfaSecret) return false;
    const secret = this.mfa.decryptSecret(user.mfaSecret);
    if (this.mfa.verifyTotp(secret, code)) {
      return true;
    }
    if (user.mfaRecoveryCodes && user.mfaRecoveryCodes.length > 0) {
      const match = this.mfa.verifyRecoveryCode(code, user.mfaRecoveryCodes);
      if (match) {
        await this.users.removeRecoveryCode(user.id, match.index);
        return true;
      }
    }
    return false;
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const claims = this.tokens.verifyRefreshToken(refreshToken);
    const tokenHash = this.tokens.hashToken(refreshToken);

    const user = await this.users.findByRefreshTokenHash(tokenHash);
    if (!user || !user.isActive) {
      // The token is valid but not in the user's allow-list — it may have been
      // reused after revocation. Revoke the entire family to contain theft.
      if (user) {
        await this.users.revokeRefreshTokenFamily(user.id, claims.family);
      }
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    await this.users.removeRefreshToken(user.id, tokenHash);
    const permissions = this.resolvePermissions(user);
    const tokenPair = this.tokens.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions,
    });
    await this.persistRefreshToken(user.id, tokenPair.refreshToken, tokenPair.family);

    return { user: toPublicUser(user), tokens: tokenPair };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return toPublicUser(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    if (input.email) {
      const existing = await this.users.findByEmail(input.email);
      if (existing && existing.id !== userId) {
        throw new ConflictError('A user with this email already exists');
      }
    }
    const updated = await this.users.updateProfile(userId, {
      name: input.name,
      email: input.email,
    });
    if (!updated) {
      throw new NotFoundError('User');
    }
    return toPublicUser(updated);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    const matches = await this.passwords.compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new ValidationError('Current password is incorrect');
    }
    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.users.setPasswordHash(user.id, passwordHash);
  }

  async getMfaStatus(userId: string): Promise<MfaStatusResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return { mfaEnabled: user.mfaEnabled };
  }

  async setupMfa(userId: string, input: SetupMfaInput): Promise<MfaSetupResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    const matches = await this.passwords.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new ValidationError('Password is incorrect');
    }
    const { secret, uri, qrCodeUrl } = await this.mfa.generateProvisioningUri(user.email);
    const encrypted = this.mfa.encryptSecret(secret);
    await this.users.setMfaTempSecret(user.id, encrypted);
    return { secret, qrCodeUrl, manualEntry: uri };
  }

  async verifyMfaSetup(userId: string, input: VerifyMfaSetupInput): Promise<MfaVerifySetupResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    const matches = await this.passwords.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new ValidationError('Password is incorrect');
    }
    if (!user.mfaTempSecret) {
      throw new ValidationError('MFA setup has not been started');
    }
    const secret = this.mfa.decryptSecret(user.mfaTempSecret);
    if (!this.mfa.verifyTotp(secret, input.totpCode)) {
      throw new ValidationError('Invalid MFA code');
    }
    const { plain, hashed } = this.mfa.generateRecoveryCodes();
    await this.users.enableMfa(user.id, this.mfa.encryptSecret(secret), hashed);
    return { mfaEnabled: true, recoveryCodes: plain };
  }

  async disableMfa(userId: string, input: DisableMfaInput): Promise<MfaStatusResponse> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    const matches = await this.passwords.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new ValidationError('Password is incorrect');
    }
    if (!user.mfaEnabled || !user.mfaSecret) {
      return { mfaEnabled: false };
    }
    const secret = this.mfa.decryptSecret(user.mfaSecret);
    let verified = this.mfa.verifyTotp(secret, input.totpCode);
    if (!verified && user.mfaRecoveryCodes && user.mfaRecoveryCodes.length > 0) {
      const match = this.mfa.verifyRecoveryCode(input.totpCode, user.mfaRecoveryCodes);
      if (match) {
        await this.users.removeRecoveryCode(user.id, match.index);
        verified = true;
      }
    }
    if (!verified) {
      throw new ValidationError('Invalid MFA code');
    }
    await this.users.disableMfa(user.id);
    return { mfaEnabled: false };
  }

  isMfaRequiredForRole(role: string): boolean {
    return this.mfa.isRequiredForRole(role);
  }

  async acceptInvitation(input: AcceptInvitationInput): Promise<LoginResponse> {
    const invitation = await this.invitations.findValidInvitation(input.token);
    const existingUser = await this.users.findByEmail(invitation.email);
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.users.create({
      name: input.name,
      email: invitation.email,
      role: invitation.role,
      permissions: invitation.permissions as Permission[],
      passwordHash,
    });

    await this.invitations.markUsed(invitation);

    const tokenPair = this.tokens.issueTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions as Permission[],
    });
    await this.persistRefreshToken(user.id, tokenPair.refreshToken, tokenPair.family);

    return { user: toPublicUser(user), tokens: tokenPair };
  }

  private resolvePermissions(user: UserHydrated): Permission[] {
    return user.permissions?.length ? (user.permissions as Permission[]) : ROLE_TEMPLATES[user.role];
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    family: string,
  ): Promise<void> {
    const ttlSeconds = this.tokens.refreshTtlSeconds;
    const now = Date.now();
    await this.users.addRefreshToken(userId, {
      tokenHash: this.tokens.hashToken(refreshToken),
      family,
      issuedAt: new Date(now),
      expiresAt: new Date(now + ttlSeconds * 1000),
    });
  }
}
