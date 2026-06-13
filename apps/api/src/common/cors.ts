import type { CorsOptions } from 'cors';

import type { AppConfig } from '../config/env.js';

const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * CORS policy. In production the allow-list from `CORS_ORIGINS` is enforced
 * strictly. In development any localhost origin is allowed, so the Vite dev
 * servers keep working even when their ports shift (e.g. 5173 is already taken).
 */
export const buildCorsOptions = (config: AppConfig): CorsOptions => {
  if (config.isProduction) {
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
