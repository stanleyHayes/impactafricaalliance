import type { CorsOptions } from 'cors';

import type { AppConfig } from '../config/env.js';

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const DEFAULT_LOCALHOST_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

const looksLikeDefaultLocalhost = (origins: string[]): boolean =>
  origins.length === DEFAULT_LOCALHOST_ORIGINS.length &&
  origins.every((origin) => DEFAULT_LOCALHOST_ORIGINS.includes(origin));

/**
 * CORS policy. In production the allow-list from `CORS_ORIGINS` is enforced
 * strictly. In development any localhost origin is allowed, so the Vite dev
 * servers keep working even when their ports shift (e.g. 5173 is already taken).
 */
export const buildCorsOptions = (config: AppConfig): CorsOptions => {
  if (config.isProduction) {
    if (config.corsOrigins.length === 0 || looksLikeDefaultLocalhost(config.corsOrigins)) {
      // Reject requests when the operator has not configured a real production allow-list.
      return {
        credentials: false,
        origin(_origin, callback) {
          callback(new Error('CORS_ORIGINS must be configured in production'), false);
        },
      };
    }
    return { origin: config.corsOrigins, credentials: false };
  }
  return {
    credentials: false,
    origin(origin, callback) {
      const allowed =
        !origin || LOCALHOST_ORIGIN.test(origin) || config.corsOrigins.includes(origin);
      callback(null, allowed);
    },
  };
};
