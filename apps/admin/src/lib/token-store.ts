import type { AuthTokens } from '@iaa/shared';

const ACCESS_KEY = 'iaa.admin.access';
const REFRESH_KEY = 'iaa.admin.refresh';

/**
 * Persists the JWT pair in localStorage. Centralised so storage is swappable.
 *
 * SECURITY NOTE: localStorage is vulnerable to XSS token theft. A future hardening
 * phase should move the refresh token (and optionally both tokens) to httpOnly,
 * SameSite, Secure cookies set by the API.
 */
export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
