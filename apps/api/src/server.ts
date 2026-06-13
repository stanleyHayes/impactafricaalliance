import 'reflect-metadata';

import type { Server } from 'node:http';

import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { buildContainer } from './container.js';
import { connectDatabase, disconnectDatabase } from './db/mongoose.js';

const bootstrap = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger(config.env);

  await connectDatabase(config, logger);
  const container = buildContainer(config, logger);
  const app = createApp(container, config, logger);

  const server: Server = app.listen(config.port, () => {
    logger.info(`API listening on port ${config.port} (${config.env})`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
      disconnectDatabase()
        .catch((error) => logger.error({ err: error }, 'Error during DB disconnect'))
        .finally(() => process.exit(0));
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

bootstrap().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
