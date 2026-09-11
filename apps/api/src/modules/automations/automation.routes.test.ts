import 'reflect-metadata';

import express from 'express';
import request from 'supertest';
import { container as rootContainer } from 'tsyringe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import * as automation from '../event-messages/event-automation.worker.js';
import * as invites from '../reviews/review-invite.worker.js';

import { createAutomationRouter } from './automation.routes.js';

const SECRET = 'x'.repeat(32);

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;

const app = (runSecret?: string) => {
  const config = { automations: { runSecret } } as unknown as AppConfig;
  return express()
    .use(express.json())
    .use('/api/automations', createAutomationRouter(rootContainer, config, logger));
};

const bothSucceed = () => {
  vi.spyOn(invites, 'runReviewInvites').mockResolvedValue({ events: 1, invitations: 95 });
  vi.spyOn(automation, 'runEventAutomation').mockResolvedValue({ reminders: 0, thankYous: 1 });
};

afterEach(() => vi.restoreAllMocks());

describe('the endpoint the scheduler calls', () => {
  it('runs the due work for a caller with the secret', async () => {
    bothSucceed();

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', SECRET);

    expect(response.status).toBe(200);
    expect(response.body.reviewInvites).toEqual({ events: 1, invitations: 95 });
    expect(response.body.eventMessages).toEqual({ reminders: 0, thankYous: 1 });
  });

  it('refuses a caller with the wrong secret', async () => {
    bothSucceed();

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', 'y'.repeat(32));

    expect(response.status).toBe(404);
    expect(invites.runReviewInvites).not.toHaveBeenCalled();
  });

  it('refuses a caller with no secret at all', async () => {
    bothSucceed();

    const response = await request(app(SECRET)).post('/api/automations/run');

    expect(response.status).toBe(404);
    expect(invites.runReviewInvites).not.toHaveBeenCalled();
  });

  // A deploy that forgot to set the secret must go quiet, not open.
  it('refuses everyone when no secret is configured', async () => {
    bothSucceed();

    const response = await request(app())
      .post('/api/automations/run')
      .set('x-automation-secret', '');

    expect(response.status).toBe(404);
    expect(invites.runReviewInvites).not.toHaveBeenCalled();
  });

  it('still sends the reminders when the invitations fail', async () => {
    vi.spyOn(invites, 'runReviewInvites').mockRejectedValue(new Error('mail provider down'));
    vi.spyOn(automation, 'runEventAutomation').mockResolvedValue({ reminders: 2, thankYous: 0 });

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', SECRET);

    // 207, so a half-failed run is red in the scheduler rather than silent.
    expect(response.status).toBe(207);
    expect(response.body.reviewInvites).toBeNull();
    expect(response.body.eventMessages).toEqual({ reminders: 2, thankYous: 0 });
  });
});
