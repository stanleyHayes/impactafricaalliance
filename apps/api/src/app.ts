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
import { globalRateLimit, webhookRateLimit } from './middleware/rate-limit.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { createAiRouter } from './modules/ai/ai.routes.js';
import { createAnalyticsRouters } from './modules/analytics/analytics.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAutomationRouter } from './modules/automations/automation.routes.js';
import { createCampaignRouter } from './modules/campaigns/campaign.routes.js';
import { buildContentModules } from './modules/content/content.registry.js';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { createEventMessageRouter } from './modules/event-messages/event-message.routes.js';
import { createEventRegistrationRouters } from './modules/event-registrations/event-registration.routes.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createMediaRouter } from './modules/media/media.routes.js';
import { createPaymentRouters } from './modules/payments/payment.routes.js';
import { createPrivacyRequestRouters } from './modules/privacy/privacy-request.routes.js';
import { createReviewRouters } from './modules/reviews/review.routes.js';
import { createSiteSettingRouters } from './modules/site-settings/site-setting.routes.js';
import { createSocialRouters } from './modules/social/social.routes.js';
import { createSubmissionRouters } from './modules/submissions/submission.routes.js';
import { createInvitationRouter } from './modules/users/invitation.routes.js';
import { createUserRouter } from './modules/users/user.routes.js';

/** Assemble the Express application from the DI container. Pure — no I/O on import. */
export const createApp = (
  container: DependencyContainer,
  config: AppConfig,
  logger: AppLogger,
): Application => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(cors(buildCorsOptions(config)));
  app.use(compression());
  app.use(pinoHttp({ logger }));

  // Payment webhooks need the raw body for signature verification — mount the
  // raw-body router BEFORE the JSON parser so the bytes are preserved.
  const payments = createPaymentRouters(container);
  app.use('/api/payments/webhooks', webhookRateLimit, payments.webhookRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use(sanitizeBody);

  app.use('/api/health', createHealthRouter());
  app.use('/api', globalRateLimit);

  app.use('/api/auth', createAuthRouter(container));
  // Called by the scheduler, not by a person; see the router for why.
  app.use('/api/automations', createAutomationRouter(container, config, logger));
  app.use('/api/live', createCampaignRouter());

  for (const module of buildContentModules(container)) {
    if (module.publicRouter) {
      app.use(`/api/${module.path}`, module.publicRouter);
    }
    app.use(`/api/admin/${module.path}`, module.adminRouter);
  }

  const eventRegistrations = createEventRegistrationRouters(container);
  app.use('/api/events', eventRegistrations.publicRouter);
  app.use('/api/admin/event-registrations', eventRegistrations.adminRouter);
  app.use('/api/admin/event-messages', createEventMessageRouter(container));

  const submissions = createSubmissionRouters(container);
  app.use('/api/submissions', submissions.publicRouter);
  app.use('/api/admin/submissions', submissions.adminRouter);

  const reviews = createReviewRouters(container);
  app.use('/api/reviews', reviews.publicRouter);
  app.use('/api/admin/reviews', reviews.adminRouter);

  const analytics = createAnalyticsRouters(container, config);
  app.use('/api/analytics', analytics.publicRouter);
  app.use('/api/admin/analytics', analytics.adminRouter);

  app.use('/api/admin/users', createUserRouter(container));
  app.use('/api/admin/dashboard', createDashboardRouter(container));
  app.use('/api/admin/invitations', createInvitationRouter(container));
  app.use('/api/admin/media', createMediaRouter(container));
  app.use('/api/admin/ai', createAiRouter(container, config));

  app.use('/api/payments', payments.donateRouter);
  app.use('/api/admin/donations', payments.adminRouter);

  const privacy = createPrivacyRequestRouters(container);
  app.use('/api/privacy/requests', privacy.publicRouter);
  app.use('/api/admin/privacy-requests', privacy.adminRouter);

  const siteSettings = createSiteSettingRouters(container);
  app.use('/api/site-settings', siteSettings.publicRouter);
  app.use('/api/admin/site-settings', siteSettings.adminRouter);

  const social = createSocialRouters(container);
  app.use('/api/social', social.publicRouter);
  app.use('/api/admin/social', social.adminRouter);

  app.use(notFoundHandler);
  app.use(errorMiddleware(logger));

  return app;
};
