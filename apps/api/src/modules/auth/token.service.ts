import type { AccessTokenClaims, AuthTokens } from '@iaa/shared';
import jwt from 'jsonwebtoken';
import { inject, injectable } from 'tsyringe';

import { UnauthorizedError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

interface RefreshTokenClaims {
  sub: string;
  type: 'refresh';
}

/** Signs and verifies the stateless JWT access/refresh token pair. */
@injectable()
export class TokenService {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  issueTokens(claims: AccessTokenClaims): AuthTokens {
    const accessToken = jwt.sign(claims, this.config.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: this.config.jwt.accessTtlSeconds,
    });
    const refreshToken = jwt.sign({ sub: claims.sub, type: 'refresh' }, this.config.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: this.config.jwt.refreshTtlSeconds,
    });
    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    try {
      const payload = jwt.verify(token, this.config.jwt.secret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || !this.isAccessClaims(payload)) {
        throw new UnauthorizedError('Invalid access token');
      }
      return { sub: payload.sub, email: payload.email, role: payload.role };
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): { sub: string } {
    try {
      const payload = jwt.verify(token, this.config.jwt.secret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || (payload as RefreshTokenClaims).type !== 'refresh') {
        throw new UnauthorizedError('Invalid refresh token');
      }
      return { sub: (payload as RefreshTokenClaims).sub };
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  private isAccessClaims(payload: jwt.JwtPayload): payload is jwt.JwtPayload & AccessTokenClaims {
    return (
      typeof payload.sub === 'string' &&
      typeof payload.email === 'string' &&
      typeof payload.role === 'string'
    );
  }
}
