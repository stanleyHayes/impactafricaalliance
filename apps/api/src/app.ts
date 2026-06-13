import compression from 'compression';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { DependencyContainer } from 'tsyringe';

import { buildCorsOptions } from './common/cors.js';
import { errorMiddleware, notFoundHandler } from './common/error-middleware.js';
import type { AppConfig } from './config/env.js';
import type { AppLogger } from './config/logger.js';
import { globalRateLimit } from './middleware/rate-limit.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { buildContentModules } from './modules/content/content.registry.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createMediaRouter } from './modules/media/media.routes.js';
import { createPaymentRouters } from './modules/payments/payment.routes.js';
import { createSubmissionRouters } from './modules/submissions/submission.routes.js';
import { createUserRouter } from './modules/users/user.routes.js';

/** Assemble the Express application from the DI container. Pure — no I/O on import. */
export const createApp = (
  container: DependencyContainer,
  config: AppConfig,
  logger: AppLogger,
): Application => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors(buildCorsOptions(config)));
  app.use(compression());
  app.use(pinoHttp({ logger }));

  // Payment webhooks need the raw body for signature verification — mount the
  // raw-body router BEFORE the JSON parser so the bytes are preserved.
  const payments = createPaymentRouters(container);
  app.use('/api/payments/webhooks', payments.webhookRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use(sanitizeBody);

  app.use('/api/health', createHealthRouter());
  app.use('/api', globalRateLimit);

  app.use('/api/auth', createAuthRouter(container));

  for (const module of buildContentModules(container)) {
    app.use(`/api/${module.path}`, module.publicRouter);
    app.use(`/api/admin/${module.path}`, module.adminRouter);
  }

  const submissions = createSubmissionRouters(container);
  app.use('/api/submissions', submissions.publicRouter);
  app.use('/api/admin/submissions', submissions.adminRouter);

  app.use('/api/admin/users', createUserRouter(container));
  app.use('/api/admin/media', createMediaRouter(container));

  app.use('/api/payments', payments.donateRouter);
  app.use('/api/admin/donations', payments.adminRouter);

  app.use(notFoundHandler);
  app.use(errorMiddleware(logger));

  return app;
};
