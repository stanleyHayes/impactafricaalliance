import { createHash, randomUUID } from 'node:crypto';

import { type AccessTokenClaims, type AuthTokens, type Permission } from '@iaa/shared';
import jwt from 'jsonwebtoken';
import { inject, injectable } from 'tsyringe';

import { UnauthorizedError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

interface RefreshTokenClaims {
  sub: string;
  type: 'refresh';
  jti: string;
  family: string;
}

export interface TokenPair extends AuthTokens {
  family: string;
}

export interface VerifiedRefreshToken {
  sub: string;
  tokenId: string;
  family: string;
}

/** Signs and verifies the stateless JWT access/refresh token pair. */
@injectable()
export class TokenService {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  get refreshTtlSeconds(): number {
    return this.config.jwt.refreshTtlSeconds;
  }

  issueTokens(claims: AccessTokenClaims): TokenPair {
    const family = randomUUID();
    const accessToken = jwt.sign({ ...claims, type: 'access' }, this.config.jwt.accessSecret, {
      algorithm: 'HS256',
      expiresIn: this.config.jwt.accessTtlSeconds,
    });
    const refreshToken = jwt.sign(
      { sub: claims.sub, type: 'refresh', jti: randomUUID(), family },
      this.config.jwt.refreshSecret,
      {
        algorithm: 'HS256',
        expiresIn: this.config.jwt.refreshTtlSeconds,
      },
    );
    return { accessToken, refreshToken, family };
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    try {
      const payload = jwt.verify(token, this.config.jwt.accessSecret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || !this.isAccessClaims(payload)) {
        throw new UnauthorizedError('Invalid access token');
      }
      return {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        permissions: Array.isArray(payload.permissions) ? (payload.permissions as Permission[]) : [],
      };
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): VerifiedRefreshToken {
    try {
      const payload = jwt.verify(token, this.config.jwt.refreshSecret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || !this.isRefreshClaims(payload)) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      return { sub: payload.sub, tokenId: payload.jti, family: payload.family };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isAccessClaims(payload: jwt.JwtPayload): payload is jwt.JwtPayload & AccessTokenClaims {
    return (
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.role === 'string' &&
      (payload.permissions === undefined || Array.isArray(payload.permissions))
    );
  }

  private isRefreshClaims(payload: jwt.JwtPayload): payload is jwt.JwtPayload & RefreshTokenClaims {
    return (
      typeof payload.sub === 'string' &&
      payload.type === 'refresh' &&
      typeof payload.jti === 'string' &&
      typeof payload.family === 'string'
    );
  }
}
