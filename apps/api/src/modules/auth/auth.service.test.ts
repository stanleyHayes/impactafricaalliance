import { UserRole } from '@iaa/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnauthorizedError } from '../../common/errors.js';
import type { UserHydrated } from '../users/user.model.js';
import type { UserRepository } from '../users/user.repository.js';

import { AuthService } from './auth.service.js';
import type { MfaService } from './mfa.service.js';
import type { PasswordService } from './password.service.js';
import type { TokenService } from './token.service.js';

const buildUser = (overrides: Partial<UserHydrated> = {}): UserHydrated =>
  ({
    id: 'user-1',
    name: 'Ada',
    email: 'ada@iaa.org',
    passwordHash: 'hashed',
    role: UserRole.Admin,
    isActive: true,
    mfaEnabled: false,
    refreshTokens: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as UserHydrated;

describe('AuthService.login', () => {
  let users: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByRefreshTokenHash: ReturnType<typeof vi.fn>;
    addRefreshToken: ReturnType<typeof vi.fn>;
  };
  let tokens: {
    issueTokens: ReturnType<typeof vi.fn>;
    hashToken: ReturnType<typeof vi.fn>;
    refreshTtlSeconds: number;
  };
  let passwords: { compare: ReturnType<typeof vi.fn> };
  let mfa: {
    decryptSecret: ReturnType<typeof vi.fn>;
    verifyTotp: ReturnType<typeof vi.fn>;
    verifyRecoveryCode: ReturnType<typeof vi.fn>;
    isRequiredForRole: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      findByRefreshTokenHash: vi.fn(),
      addRefreshToken: vi.fn(),
    };
    tokens = {
      issueTokens: vi.fn().mockReturnValue({ accessToken: 'a', refreshToken: 'r', family: 'fam' }),
      hashToken: vi.fn().mockReturnValue('hashed-r'),
      refreshTtlSeconds: 2_592_000,
    };
    passwords = { compare: vi.fn() };
    mfa = {
      decryptSecret: vi.fn(),
      verifyTotp: vi.fn(),
      verifyRecoveryCode: vi.fn(),
      isRequiredForRole: vi.fn().mockReturnValue(false),
    };
    service = new AuthService(
      users as unknown as UserRepository,
      tokens as unknown as TokenService,
      passwords as unknown as PasswordService,
      mfa as unknown as MfaService,
    );
  });

  it('issues tokens for valid credentials', async () => {
    users.findByEmail.mockResolvedValue(buildUser());
    passwords.compare.mockResolvedValue(true);

    const result = await service.login({ email: 'ada@iaa.org', password: 'secret' });

    expect(result.user.email).toBe('ada@iaa.org');
    expect(result.tokens.accessToken).toBe('a');
    expect(tokens.issueTokens).toHaveBeenCalledOnce();
    expect(users.addRefreshToken).toHaveBeenCalledOnce();
  });

  it('rejects an unknown email without leaking which field was wrong', async () => {
    users.findByEmail.mockResolvedValue(null);
    passwords.compare.mockResolvedValue(false);

    await expect(service.login({ email: 'nobody@iaa.org', password: 'x' })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('rejects a deactivated account', async () => {
    users.findByEmail.mockResolvedValue(buildUser({ isActive: false }));
    passwords.compare.mockResolvedValue(true);

    await expect(service.login({ email: 'ada@iaa.org', password: 'secret' })).rejects.toThrow(
      /deactivated/i,
    );
  });

  it('still runs a password comparison for unknown emails (timing safety)', async () => {
    users.findByEmail.mockResolvedValue(null);
    passwords.compare.mockResolvedValue(false);

    await service.login({ email: 'ghost@iaa.org', password: 'x' }).catch(() => undefined);

    expect(passwords.compare).toHaveBeenCalledOnce();
  });

  it('requests MFA when enabled and no code is provided', async () => {
    users.findByEmail.mockResolvedValue(buildUser({ mfaEnabled: true, mfaSecret: 'enc-secret' }));
    passwords.compare.mockResolvedValue(true);

    const result = await service.login({ email: 'ada@iaa.org', password: 'secret' });

    expect('mfaRequired' in result && result.mfaRequired).toBe(true);
    expect(tokens.issueTokens).not.toHaveBeenCalled();
  });

  it('issues tokens when a valid MFA code is provided', async () => {
    users.findByEmail.mockResolvedValue(buildUser({ mfaEnabled: true, mfaSecret: 'enc-secret' }));
    passwords.compare.mockResolvedValue(true);
    mfa.decryptSecret.mockReturnValue('plain-secret');
    mfa.verifyTotp.mockReturnValue(true);

    const result = await service.login({ email: 'ada@iaa.org', password: 'secret', totpCode: '123456' });

    expect('tokens' in result).toBe(true);
    expect(mfa.verifyTotp).toHaveBeenCalledWith('plain-secret', '123456');
  });

  it('rejects an invalid MFA code', async () => {
    users.findByEmail.mockResolvedValue(buildUser({ mfaEnabled: true, mfaSecret: 'enc-secret' }));
    passwords.compare.mockResolvedValue(true);
    mfa.decryptSecret.mockReturnValue('plain-secret');
    mfa.verifyTotp.mockReturnValue(false);
    mfa.verifyRecoveryCode.mockReturnValue(null);

    await expect(
      service.login({ email: 'ada@iaa.org', password: 'secret', totpCode: '000000' }),
    ).rejects.toThrow(/invalid mfa code/i);
  });
});
