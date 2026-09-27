import 'reflect-metadata';

import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { vi } from 'vitest';

import { createApp } from '../src/app.js';
import { loadConfig, type AppConfig } from '../src/config/env.js';
import { createLogger } from '../src/config/logger.js';
import { buildContainer } from '../src/container.js';
import { connectDatabase } from '../src/db/mongoose.js';
import { TOKENS } from '../src/tokens.js';

export interface TestContext {
  /**
   * The app, already listening on the loopback address for the whole file.
   * Handing supertest a bare Express app makes it open a fresh server on every
   * request, bound to all interfaces; with several test files running at once,
   * another process holding the same port on 127.0.0.1 (a test server or an
   * in-memory mongod) then answers instead, with a stray 404 or no HTTP at all.
   * A server bound to 127.0.0.1 itself always wins its own port.
   */
  app: Server;
  config: AppConfig;
  emailSend: ReturnType<typeof vi.fn>;
  teardown: () => Promise<void>;
}

/**
 * Spin up the real Express app against an in-memory MongoDB, with external
 * providers (email) replaced by spies. Exercises the DI container exactly as
 * production does — the genuine test that runtime resolution is wired correctly.
 */
export const createTestContext = async (): Promise<TestContext> => {
  // First-run binary start can exceed the 10s default on slower machines / CI.
  process.env.MONGOMS_STARTUP_TIMEOUT ??= '60000';
  const mongo = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-secret-test-secret-0123456';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-secret-test-secret-012345';
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-0123456789';
  process.env.SEED_ADMIN_PASSWORD = 'TestSeedAdminPass2026!';

  const config = loadConfig();
  const logger = createLogger('test');
  await connectDatabase(config, logger);

  const container = buildContainer(config, logger);
  const emailSend = vi.fn().mockResolvedValue(undefined);
  container.register(TOKENS.EmailProvider, { useValue: { send: emailSend } });

  const server = createServer(createApp(container, config, logger));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  return {
    app: server,
    config,
    emailSend,
    teardown: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await mongoose.disconnect();
      await mongo.stop();
    },
  };
};
