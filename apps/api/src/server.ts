import 'reflect-metadata';
import 'dotenv/config';

import type { Server } from 'node:http';

import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { buildContainer } from './container.js';
import { connectDatabase, disconnectDatabase } from './db/mongoose.js';
import { startEventAutomationWorker } from './modules/event-messages/event-automation.worker.js';
import { startRetentionJobs } from './modules/privacy/retention.service.js';
import { startReviewInviteWorker } from './modules/reviews/review-invite.worker.js';
import { startSocialPublicationWorker } from './modules/social/social-publication.worker.js';

const REQUEST_TIMEOUT_MS = 30_000;

const bootstrap = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger(config.env);

  await connectDatabase(config, logger);
  const container = buildContainer(config, logger);
  const app = createApp(container, config, logger);
  const stopRetentionJobs = startRetentionJobs(config, logger);
  const stopSocialWorker = startSocialPublicationWorker(container, logger);
  const stopReviewInvites = startReviewInviteWorker(container, logger);
  const stopEventAutomation = startEventAutomationWorker(container, logger);

  const server: Server = app.listen(config.port, () => {
    logger.info(`API listening on port ${config.port} (${config.env})`);
  });
  server.setTimeout(REQUEST_TIMEOUT_MS);
  server.requestTimeout = REQUEST_TIMEOUT_MS;

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    stopRetentionJobs();
    stopSocialWorker();
    stopReviewInvites();
    stopEventAutomation();
    server.close(() => {
      disconnectDatabase()
        .catch((error) => logger.error({ err: error }, 'Error during DB disconnect'))
        .finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
