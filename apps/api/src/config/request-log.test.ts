import { Writable } from 'node:stream';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createLogger } from './logger.js';
import { addressForLog, requestLogger } from './request-log.js';

const AUTOMATION_SECRET = 'LEAKCHECK-automation-secret';
const INGEST_KEY = 'LEAKCHECK-ingest-key';
const REVIEW_TOKEN = 'LEAKCHECKreviewtoken0123456789abcdef';
const OAUTH_CODE = 'LEAKCHECK-oauth-code';
const OAUTH_STATE = 'LEAKCHECK-oauth-state';
const SESSION_COOKIE = 'LEAKCHECK-cookie-value';

/** The app's request logger in front of routes shaped like the real ones. */
const appWithLog = (): { app: express.Express; lines: string[] } => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      lines.push(chunk.toString('utf8'));
      done();
    },
  });
  const app = express();
  app.use(requestLogger(createLogger('production', stream)));
  app.post('/api/automations/run', (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/api/analytics/collect', (_req, res) => {
    res.status(204).end();
  });
  app.get('/api/reviews/link/:token', (_req, res) => {
    res.json({ ok: true });
  });
  app.get('/api/social/:platform/callback', (_req, res) => {
    res.redirect('https://admin.example.org/social?connected=linkedin');
  });
  app.get('/api/admin/social/:platform/connect', (_req, res) => {
    res.cookie('iaa_oauth_state', SESSION_COOKIE, { httpOnly: true });
    res.redirect(
      `https://www.linkedin.com/oauth/v2/authorization?client_id=abc&state=${OAUTH_STATE}`,
    );
  });
  app.get('/api/content/articles', (_req, res) => {
    res.json({ items: [] });
  });
  return { app, lines };
};

describe('the request log', () => {
  it('leaves out the scheduler’s and the website’s secret headers', async () => {
    const { app, lines } = appWithLog();
    await request(app)
      .post('/api/automations/run')
      .set('x-automation-secret', AUTOMATION_SECRET)
      .expect(200);
    await request(app)
      .post('/api/analytics/collect')
      .set('x-iaa-ingest-key', INGEST_KEY)
      .set('User-Agent', 'iaa-test-agent')
      .expect(204);

    const output = lines.join('');
    expect(output).not.toContain(AUTOMATION_SECRET);
    expect(output).not.toContain(INGEST_KEY);
    expect(output).toContain('iaa-test-agent');
    expect(lines).toHaveLength(2);
  });

  it('blanks credentials in the address and keeps the rest', async () => {
    const { app, lines } = appWithLog();
    await request(app).get(`/api/reviews/link/${REVIEW_TOKEN}`).expect(200);
    await request(app)
      .get(`/api/social/linkedin/callback?code=${OAUTH_CODE}&state=${OAUTH_STATE}`)
      .expect(302);
    await request(app).get('/api/content/articles?page=2&status=published').expect(200);

    const output = lines.join('');
    expect(output).not.toContain(REVIEW_TOKEN);
    expect(output).not.toContain(OAUTH_CODE);
    expect(output).not.toContain(OAUTH_STATE);
    expect(output).toContain('/api/reviews/link/[redacted]');
    expect(output).toContain('/api/social/linkedin/callback?code=[redacted]&state=[redacted]');
    expect(output).toContain('/api/content/articles?page=2&status=published');
  });

  it('leaves out the cookies the API sets and blanks the state it redirects with', async () => {
    const { app, lines } = appWithLog();
    await request(app).get('/api/admin/social/linkedin/connect').expect(302);

    const output = lines.join('');
    expect(output).not.toContain(SESSION_COOKIE);
    expect(output).not.toContain(OAUTH_STATE);
    expect(output).toContain('client_id=abc');
  });
});

describe('addressForLog', () => {
  it('blanks sensitive parameters however they are written', () => {
    expect(addressForLog('/x?access_token=a&Email=b%40c.org&apiKey=d&page=1')).toBe(
      '/x?access_token=[redacted]&Email=[redacted]&apiKey=[redacted]&page=1',
    );
  });

  it('leaves an address without a query alone', () => {
    expect(addressForLog('/api/health')).toBe('/api/health');
  });
});
