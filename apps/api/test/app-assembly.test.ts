import 'reflect-metadata';

import type { Application } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createLogger } from '../src/config/logger.js';
import { buildContainer } from '../src/container.js';

let app: Application;

beforeAll(() => {
  // No DB connection is opened here: this proves the DI container resolves the
  // entire controller/service/repository graph and Express assembles correctly.
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/iaa-test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-secret-test-secret-0123456';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-secret-test-secret-012345';
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-0123456789';
  process.env.SEED_ADMIN_PASSWORD = 'TestSeedAdminPass2026!';
  const config = loadConfig();
  const logger = createLogger('test');
  app = createApp(buildContainer(config, logger), config, logger);
});

describe('Application assembly (no database)', () => {
  it('resolves the full DI graph and serves a 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('reports a degraded health status while the database is disconnected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.db).toBe('disconnected');
  });

  it('guards admin routes behind authentication', async () => {
    const res = await request(app).get('/api/admin/articles');
    expect(res.status).toBe(401);
  });

  it('rejects invalid donation requests with a validation error', async () => {
    const res = await request(app).post('/api/payments').send({ provider: 'stripe' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
