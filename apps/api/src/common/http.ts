import type { Request } from 'express';

/**
 * Read a path parameter as a single string. Express 5 types route params as
 * `string | string[]` (wildcard support); we always declare single params, so
 * we collapse the array form defensively.
 */
export const pathParam = (req: Request, name: string): string => {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
};
