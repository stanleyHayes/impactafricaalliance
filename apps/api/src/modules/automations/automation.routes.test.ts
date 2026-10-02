import 'reflect-metadata';

import express from 'express';
import request from 'supertest';
import { container as rootContainer } from 'tsyringe';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import * as automation from '../event-messages/event-automation.worker.js';
import * as drafts from '../forms/draft-files.js';
import * as paystack from '../payments/paystack-check.js';
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

const paystackChecked = { checked: 3, succeeded: 1, failed: 1, pending: 1, errors: 0 };

const bothSucceed = () => {
  vi.spyOn(invites, 'runReviewInvites').mockResolvedValue({ events: 1, invitations: 95 });
  vi.spyOn(automation, 'runEventAutomation').mockResolvedValue({ reminders: 0, thankYous: 1 });
  vi.spyOn(drafts, 'runDraftSweep').mockResolvedValue({ removed: 2, kept: 0 });
  vi.spyOn(paystack, 'runPaystackCheck').mockResolvedValue(paystackChecked);
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
    expect(response.body.expiredDrafts).toEqual({ removed: 2, kept: 0 });
    expect(response.body.paystackDonations).toEqual(paystackChecked);
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
    vi.spyOn(drafts, 'runDraftSweep').mockResolvedValue({ removed: 0, kept: 0 });
    vi.spyOn(paystack, 'runPaystackCheck').mockResolvedValue(paystackChecked);

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', SECRET);

    // 207, so a half-failed run is red in the scheduler rather than silent.
    expect(response.status).toBe(207);
    expect(response.body.reviewInvites).toBeNull();
    expect(response.body.eventMessages).toEqual({ reminders: 2, thankYous: 0 });
  });

  it('reports a failed draft sweep without stopping the emails', async () => {
    vi.spyOn(invites, 'runReviewInvites').mockResolvedValue({ events: 0, invitations: 0 });
    vi.spyOn(automation, 'runEventAutomation').mockResolvedValue({ reminders: 1, thankYous: 0 });
    vi.spyOn(drafts, 'runDraftSweep').mockRejectedValue(new Error('database away'));
    vi.spyOn(paystack, 'runPaystackCheck').mockResolvedValue(paystackChecked);

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', SECRET);

    expect(response.status).toBe(207);
    expect(response.body.expiredDrafts).toBeNull();
    expect(response.body.eventMessages).toEqual({ reminders: 1, thankYous: 0 });
  });

  it('runs everything else when the Paystack donation check fails', async () => {
    vi.spyOn(invites, 'runReviewInvites').mockResolvedValue({ events: 1, invitations: 4 });
    vi.spyOn(automation, 'runEventAutomation').mockResolvedValue({ reminders: 1, thankYous: 0 });
    vi.spyOn(drafts, 'runDraftSweep').mockResolvedValue({ removed: 1, kept: 0 });
    vi.spyOn(paystack, 'runPaystackCheck').mockRejectedValue(new Error('database away'));

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', SECRET);

    expect(response.status).toBe(207);
    expect(response.body.paystackDonations).toBeNull();
    expect(response.body.reviewInvites).toEqual({ events: 1, invitations: 4 });
    expect(response.body.eventMessages).toEqual({ reminders: 1, thankYous: 0 });
    expect(response.body.expiredDrafts).toEqual({ removed: 1, kept: 0 });
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'The Paystack donation check failed during a scheduled run',
    );
  });

  it('shows the run as failed when the Paystack check could ask Paystack about nothing', async () => {
    bothSucceed();
    // Every gift erred: a key Paystack no longer accepts, or Paystack out of reach.
    const refused = { checked: 4, succeeded: 0, failed: 0, pending: 0, errors: 4 };
    vi.spyOn(paystack, 'runPaystackCheck').mockResolvedValue(refused);

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', SECRET);

    expect(response.status).toBe(207);
    // The counts still say what happened.
    expect(response.body.paystackDonations).toEqual(refused);
    expect(response.body.reviewInvites).toEqual({ events: 1, invitations: 95 });
  });

  it('stays green when Paystack could not answer for some gifts but did for others', async () => {
    bothSucceed();
    vi.spyOn(paystack, 'runPaystackCheck').mockResolvedValue({
      checked: 4,
      succeeded: 2,
      failed: 0,
      pending: 1,
      errors: 1,
    });

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', SECRET);

    expect(response.status).toBe(200);
  });

  // The real check, given a container that cannot build it: it fails alone, as a rejection.
  it('keeps the run going when the check cannot even start', async () => {
    vi.spyOn(invites, 'runReviewInvites').mockResolvedValue({ events: 0, invitations: 0 });
    vi.spyOn(automation, 'runEventAutomation').mockResolvedValue({ reminders: 0, thankYous: 0 });
    vi.spyOn(drafts, 'runDraftSweep').mockResolvedValue({ removed: 0, kept: 0 });

    const response = await request(app(SECRET))
      .post('/api/automations/run')
      .set('x-automation-secret', SECRET);

    expect(response.status).toBe(207);
    expect(response.body.paystackDonations).toBeNull();
    expect(response.body.expiredDrafts).toEqual({ removed: 0, kept: 0 });
  });
});
