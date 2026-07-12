import { type AdminResource, PermissionAction, type Permission, type UserRole } from '@iaa/shared';
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

const hasAnyPermission = (userPermissions: Permission[], required: Permission[]): boolean =>
  required.some((permission) => userPermissions.includes(permission));

/** Guards a route so the caller has every listed permission. Use after `requireAuth`. */
export const requirePermission =
  (...permissions: Permission[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!permissions.every((permission) => req.user!.permissions.includes(permission))) {
      throw new ForbiddenError('Missing required permission');
    }
    next();
  };

/** Guards a route so the caller has at least one of the listed permissions. Use after `requireAuth`. */
export const requireAnyPermission =
  (...permissions: Permission[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!hasAnyPermission(req.user.permissions, permissions)) {
      throw new ForbiddenError('Missing required permission');
    }
    next();
  };

const methodActionMap: Record<string, PermissionAction | undefined> = {
  GET: PermissionAction.Read,
  POST: PermissionAction.Create,
  PATCH: PermissionAction.Update,
  DELETE: PermissionAction.Delete,
};

/** Guards a resource route by deriving the required permission from the HTTP method. */
export const requirePermissionFor =
  (resource: AdminResource): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    const action = methodActionMap[req.method];
    if (!action) {
      next();
      return;
    }
    requirePermission(`${resource}:${action}` as Permission)(req, res, next);
  };
