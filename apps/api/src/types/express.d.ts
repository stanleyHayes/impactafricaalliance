import type { AccessTokenClaims } from '@iaa/shared';

declare global {
  namespace Express {
    interface Request {
      /** Populated by `requireAuth`; present on every authenticated route. */
      user?: AccessTokenClaims;
      /** Raw request body buffer, captured for payment webhook signature checks. */
      rawBody?: Buffer;
    }
  }
}

export {};
