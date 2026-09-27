import { randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../config/env.js';
import { TokenService } from '../modules/auth/token.service.js';

import {
  createPreviewLink,
  PREVIEW_TOKEN_AUDIENCE,
  PREVIEW_TOKEN_TTL_SECONDS,
  signPreviewToken,
  verifyPreviewToken,
} from './preview-token.js';

// Fresh secrets per run: nothing here should look like, or be, a real key.
const secret = randomBytes(32).toString('hex');
const otherSecret = randomBytes(32).toString('hex');
const config = {
  jwt: {
    accessSecret: secret,
    refreshSecret: randomBytes(32).toString('hex'),
    accessTtlSeconds: 900,
    refreshTtlSeconds: 3600,
  },
  siteUrl: 'https://impactafricaalliance.org/',
} as AppConfig;
const storyId = '64b7f0c2a1b2c3d4e5f60718';

afterEach(() => {
  vi.useRealTimers();
});

describe('preview tokens', () => {
  it('round-trips the id for the kind it was issued for', () => {
    const { token } = signPreviewToken({ kind: 'impact-story', id: storyId }, config);
    expect(verifyPreviewToken(token, 'impact-story', config)).toBe(storyId);
  });

  it('expires two hours after it is issued', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T09:00:00.000Z'));
    const { token, expiresAt } = signPreviewToken({ kind: 'form', id: storyId }, config);
    expect(expiresAt).toBe('2026-10-05T11:00:00.000Z');

    vi.setSystemTime(new Date('2026-10-05T10:59:00.000Z'));
    expect(verifyPreviewToken(token, 'form', config)).toBe(storyId);
    vi.setSystemTime(new Date(Date.parse(expiresAt) + 1000));
    expect(verifyPreviewToken(token, 'form', config)).toBeNull();
  });

  it('refuses a token issued for the other kind of record', () => {
    const { token } = signPreviewToken({ kind: 'form', id: storyId }, config);
    expect(verifyPreviewToken(token, 'impact-story', config)).toBeNull();
  });

  it('refuses a tampered token', () => {
    const { token } = signPreviewToken({ kind: 'form', id: storyId }, config);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'form:0123456789abcdef01234567', aud: PREVIEW_TOKEN_AUDIENCE }),
    ).toString('base64url');
    expect(verifyPreviewToken(`${header}.${forged}.${signature}`, 'form', config)).toBeNull();
    expect(verifyPreviewToken(`${token.slice(0, -2)}xx`, 'form', config)).toBeNull();
  });

  it('refuses a token signed with another secret, or for another audience', () => {
    const wrongSecret = jwt.sign({}, otherSecret, {
      audience: PREVIEW_TOKEN_AUDIENCE,
      subject: `form:${storyId}`,
      expiresIn: PREVIEW_TOKEN_TTL_SECONDS,
    });
    const wrongAudience = jwt.sign({}, secret, {
      audience: 'somewhere-else',
      subject: `form:${storyId}`,
      expiresIn: PREVIEW_TOKEN_TTL_SECONDS,
    });
    expect(verifyPreviewToken(wrongSecret, 'form', config)).toBeNull();
    expect(verifyPreviewToken(wrongAudience, 'form', config)).toBeNull();
  });

  it('refuses a missing token and a subject that is not a record id', () => {
    const odd = jwt.sign({}, secret, {
      audience: PREVIEW_TOKEN_AUDIENCE,
      subject: 'form:../../users',
      expiresIn: PREVIEW_TOKEN_TTL_SECONDS,
    });
    expect(verifyPreviewToken(undefined, 'form', config)).toBeNull();
    expect(verifyPreviewToken('', 'form', config)).toBeNull();
    expect(verifyPreviewToken(odd, 'form', config)).toBeNull();
  });

  it('cannot be used as an access token, and an access token cannot preview', () => {
    const tokens = new TokenService(config);
    const { token } = signPreviewToken({ kind: 'form', id: storyId }, config);
    expect(() => tokens.verifyAccessToken(token)).toThrow();

    const { accessToken } = tokens.issueTokens({
      sub: storyId,
      email: 'editor@iaa.org',
      role: 'editor',
      permissions: [],
    });
    expect(verifyPreviewToken(accessToken, 'form', config)).toBeNull();
  });
});

describe('createPreviewLink', () => {
  it('puts the token after # on the public preview page for its kind', () => {
    const story = createPreviewLink({ kind: 'impact-story', id: storyId }, config);
    const form = createPreviewLink({ kind: 'form', id: storyId }, config);
    expect(story.url).toMatch(/^https:\/\/impactafricaalliance\.org\/impact\/stories\/preview#ey/);
    expect(form.url).toMatch(/^https:\/\/impactafricaalliance\.org\/apply\/preview#ey/);
    const token = story.url.split('#')[1];
    expect(verifyPreviewToken(token, 'impact-story', config)).toBe(storyId);
  });
});
