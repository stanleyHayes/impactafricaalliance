import type { UserRole } from '@iaa/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { ForbiddenError, UnauthorizedError } from '../common/errors.js';
import type { TokenService } from '../modules/auth/token.service.js';

const BEARER_PREFIX = 'Bearer ';

const extractToken = (header: string | undefined): string => {
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError('Missing bearer token');
  }
  return header.slice(BEARER_PREFIX.length).trim();
};

/** Verifies the access token and attaches the caller's claims to the request. */
export const requireAuth =
  (tokens: TokenService): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const token = extractToken(req.headers.authorization);
    req.user = tokens.verifyAccessToken(token);
    next();
  };

/** Guards a route so only the listed roles may proceed. Use after `requireAuth`. */
export const requireRole =
  (...allowed: UserRole[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!allowed.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
