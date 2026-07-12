import { createHash, randomBytes } from 'crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidationError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import type { UserHydrated } from '../users/user.model.js';
import type { UserRepository } from '../users/user.repository.js';

import { PasswordResetService } from './password-reset.service.js';
import type { PasswordService } from './password.service.js';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const buildUser = (overrides: Partial<UserHydrated> = {}): UserHydrated =>
  ({
    id: 'user-1',
    name: 'Ada',
    email: 'ada@iaa.org',
    passwordHash: 'old-hash',
    role: 'admin',
    isActive: true,
    mfaEnabled: false,
    refreshTokens: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as UserHydrated;

describe('PasswordResetService', () => {
  let users: {
    findByEmail: ReturnType<typeof vi.fn>;
    setPasswordResetToken: ReturnType<typeof vi.fn>;
    findByPasswordResetTokenHash: ReturnType<typeof vi.fn>;
    setPasswordHash: ReturnType<typeof vi.fn>;
    clearPasswordResetToken: ReturnType<typeof vi.fn>;
  };
  let passwords: { hash: ReturnType<typeof vi.fn> };
  let email: { send: ReturnType<typeof vi.fn> };
  let config: AppConfig;
  let logger: AppLogger;
  let service: PasswordResetService;

  beforeEach(() => {
    users = {
      findByEmail: vi.fn(),
      setPasswordResetToken: vi.fn(),
      findByPasswordResetTokenHash: vi.fn(),
      setPasswordHash: vi.fn(),
      clearPasswordResetToken: vi.fn(),
    };
    passwords = { hash: vi.fn().mockResolvedValue('new-hash') };
    email = { send: vi.fn().mockResolvedValue(undefined) };
    config = {
      adminUrl: 'http://localhost:5174',
      env: 'test',
      isProduction: false,
      isTest: true,
      email: { apiKey: undefined, from: 'test@example.com', notifyTo: 'notify@example.com' },
    } as AppConfig;
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn() } as unknown as AppLogger;

    service = new PasswordResetService(
      users as unknown as UserRepository,
      passwords as unknown as PasswordService,
      email as unknown as EmailProvider,
      config,
      logger,
    );
  });

  describe('requestReset', () => {
    it('stores a hashed token and sends a reset email for an existing user', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      const result = await service.requestReset('ada@iaa.org');

      expect(users.setPasswordResetToken).toHaveBeenCalledOnce();
      const [, tokenHash, expiresAt] = users.setPasswordResetToken.mock.calls[0];
      expect(typeof tokenHash).toBe('string');
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(email.send).toHaveBeenCalledOnce();
      const message = email.send.mock.calls[0][0];
      expect(message.to).toBe('ada@iaa.org');
      expect(message.subject).toMatch(/reset your.*password/i);
      expect(result.email).toBe('ada@iaa.org');
      expect(result.token).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@iaa.org', resetUrl: expect.stringContaining('/reset-password?token=') }),
        'Password reset token generated (dev/test only)',
      );
    });

    it('returns silently for an unknown email without sending an email', async () => {
      users.findByEmail.mockResolvedValue(null);

      const result = await service.requestReset('missing@iaa.org');

      expect(result.email).toBe('missing@iaa.org');
      expect(result.token).toBeUndefined();
      expect(users.setPasswordResetToken).not.toHaveBeenCalled();
      expect(email.send).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledOnce();
    });
  });

  describe('resetPassword', () => {
    it('updates the password and clears the reset token when the token is valid', async () => {
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      users.findByPasswordResetTokenHash.mockResolvedValue(
        buildUser({ passwordResetToken: tokenHash, passwordResetExpiresAt: new Date(Date.now() + 60_000) }),
      );

      await service.resetPassword({ token, password: 'NewSecurePass123!' });

      expect(passwords.hash).toHaveBeenCalledWith('NewSecurePass123!');
      expect(users.setPasswordHash).toHaveBeenCalledWith('user-1', 'new-hash');
      expect(users.clearPasswordResetToken).toHaveBeenCalledWith('user-1');
    });

    it('throws a validation error when the token is invalid or expired', async () => {
      users.findByPasswordResetTokenHash.mockResolvedValue(null);

      await expect(service.resetPassword({ token: 'bad-token', password: 'NewSecurePass123!' })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });
});
