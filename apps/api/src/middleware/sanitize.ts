import type { NextFunction, Request, Response } from 'express';

/**
 * Strip MongoDB operator injection vectors (keys starting with `$` or containing
 * `.`) from the request body. Express 5 makes `req.query`/`req.params` read-only
 * getters, so — unlike express-mongo-sanitize — we only sanitise the body, which
 * is the surface we actually pass into queries. All query filters in this app are
 * built from validated scalar values, never raw user objects.
 */
const scrub = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      result[key] = scrub(nested);
    }
    return result;
  }
  return value;
};

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = scrub(req.body);
  }
  next();
};
