import type { ChangePasswordInput, LoginInput, LoginResponse, PublicUser } from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { NotFoundError, UnauthorizedError, ValidationError } from '../../common/errors.js';
import { toPublicUser } from '../users/user.model.js';
import { UserRepository } from '../users/user.repository.js';

import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

/** Authentication workflows: login, token refresh, password change. */
@injectable()
export class AuthService {
  constructor(
    @inject(UserRepository) private readonly users: UserRepository,
    @inject(TokenService) private readonly tokens: TokenService,
    @inject(PasswordService) private readonly passwords: PasswordService,
  ) {}

  async login(input: LoginInput): Promise<LoginResponse> {
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

    const tokens = this.tokens.issueTokens({ sub: user.id, email: user.email, role: user.role });
    return { user: toPublicUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const { sub } = this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.users.findById(sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account is no longer active');
    }
    const tokens = this.tokens.issueTokens({ sub: user.id, email: user.email, role: user.role });
    return { user: toPublicUser(user), tokens };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return toPublicUser(user);
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
}
