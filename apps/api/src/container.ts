import 'reflect-metadata';

import { container as rootContainer, type DependencyContainer } from 'tsyringe';

import type { AppConfig } from './config/env.js';
import type { AppLogger } from './config/logger.js';
import { ResendEmailProvider } from './providers/email.provider.js';
import { CloudinaryMediaProvider } from './providers/media.provider.js';
import { TOKENS } from './tokens.js';

/**
 * Composition root. Registers the runtime singletons (config, logger) and binds
 * each provider interface token to its concrete implementation. Returns a child
 * container so tests can build an isolated graph with mocked providers.
 */
export const buildContainer = (config: AppConfig, logger: AppLogger): DependencyContainer => {
  const container = rootContainer.createChildContainer();

  container.registerInstance(TOKENS.Config, config);
  container.registerInstance(TOKENS.Logger, logger);
  container.register(TOKENS.EmailProvider, { useClass: ResendEmailProvider });
  container.register(TOKENS.MediaProvider, { useClass: CloudinaryMediaProvider });

  return container;
};
