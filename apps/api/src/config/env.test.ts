import { describe, expect, it } from 'vitest';

import { loadConfig } from './env.js';

const base = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/iaa-test',
  JWT_SECRET: 'test-secret-test-secret-test-secret-0123456789',
  SEED_ADMIN_PASSWORD: 'TestSeedAdminPass2026!',
};

const production = {
  ...base,
  NODE_ENV: 'production',
  PUBLIC_SITE_URL: 'https://impactafricaalliance.org',
  JWT_ACCESS_SECRET: 'access-secret-access-secret-access-secret-0123',
  JWT_REFRESH_SECRET: 'refresh-secret-refresh-secret-refresh-secret-01',
  MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
};

const productionWith = (env: Record<string, string>) =>
  loadConfig({ ...production, ...env } as NodeJS.ProcessEnv);

const paystackFrom = (env: Record<string, string>) =>
  loadConfig({ ...base, ...env } as NodeJS.ProcessEnv).paystack;

describe('Paystack configuration', () => {
  it('charges in cedis at api.paystack.co unless told otherwise', () => {
    expect(paystackFrom({})).toEqual({
      secretKey: undefined,
      currency: 'GHS',
      apiUrl: 'https://api.paystack.co',
    });
  });

  it('treats blank values as unset and reads the currency in any case', () => {
    expect(paystackFrom({ PAYSTACK_CURRENCY: '', PAYSTACK_API_URL: '' })).toMatchObject({
      currency: 'GHS',
      apiUrl: 'https://api.paystack.co',
    });
    expect(paystackFrom({ PAYSTACK_CURRENCY: ' usd ' }).currency).toBe('USD');
  });

  it('refuses a currency the site has no amounts for', () => {
    expect(() => paystackFrom({ PAYSTACK_CURRENCY: 'NGN' })).toThrow(/PAYSTACK_CURRENCY/);
  });

  it('has no separate webhook secret: the secret key signs the webhooks', () => {
    const paystack = paystackFrom({ PAYSTACK_SECRET_KEY: 'sk_test_example' });
    expect(paystack).toEqual({
      secretKey: 'sk_test_example',
      currency: 'GHS',
      apiUrl: 'https://api.paystack.co',
    });
  });

  it('lets a local stand-in take Paystack’s place outside production only', () => {
    expect(paystackFrom({ PAYSTACK_API_URL: 'http://localhost:4401' }).apiUrl).toBe(
      'http://localhost:4401',
    );
    expect(() => productionWith({ PAYSTACK_API_URL: 'http://localhost:4401' })).toThrow(
      /PAYSTACK_API_URL must be https:\/\/api\.paystack\.co in production/,
    );
    expect(loadConfig(production as NodeJS.ProcessEnv).paystack.apiUrl).toBe(
      'https://api.paystack.co',
    );
  });

  it('sends the secret key nowhere but Paystack’s own API in production', () => {
    for (const apiUrl of [
      'https://api.paystack.co.example.org',
      'https://paystack.example.org',
      'http://api.paystack.co',
      'https://api.paystack.co:8443',
      'https://user:pass@api.paystack.co',
      'https://api.paystack.co/proxy',
    ]) {
      expect(() => productionWith({ PAYSTACK_API_URL: apiUrl }), apiUrl).toThrow(
        /PAYSTACK_API_URL must be https:\/\/api\.paystack\.co in production/,
      );
    }
    for (const apiUrl of ['https://api.paystack.co', 'https://api.paystack.co/', '']) {
      expect(productionWith({ PAYSTACK_API_URL: apiUrl }).paystack.apiUrl, apiUrl).toMatch(
        /^https:\/\/api\.paystack\.co\/?$/,
      );
    }
  });
});

const SITE_URL_REFUSED =
  /PUBLIC_SITE_URL must be just the site's public https address \(like https:\/\/impactafricaalliance\.org\) in production/;

describe('the address Paystack sends donors back to', () => {
  it('must be the site’s public https address in production', () => {
    for (const siteUrl of [
      'http://impactafricaalliance.org',
      'https://localhost',
      'https://localhost:5173',
      'https://127.0.0.1',
      'https://127.1.2.3:8080',
      'https://[::1]',
      'https://0.0.0.0',
      'https://site.localhost',
    ]) {
      expect(() => productionWith({ PUBLIC_SITE_URL: siteUrl }), siteUrl).toThrow(SITE_URL_REFUSED);
    }
    expect(() =>
      loadConfig({ ...production, PUBLIC_SITE_URL: undefined } as NodeJS.ProcessEnv),
    ).toThrow(/PUBLIC_SITE_URL/);
    expect(
      productionWith({ PUBLIC_SITE_URL: 'https://www.impactafricaalliance.org' }).siteUrl,
    ).toBe('https://www.impactafricaalliance.org');
  });

  it('refuses this machine and bare addresses however they are written', () => {
    for (const siteUrl of [
      // This machine, by a name with a trailing dot or by another spelling of its address.
      'https://localhost.',
      'https://foo.localhost.',
      'https://LOCALHOST',
      'https://0x7f.1',
      'https://2130706433',
      'https://127.0.0.1.',
      'https://0',
      'https://[::]',
      'https://[0:0:0:0:0:0:0:1]',
      'https://[::ffff:127.0.0.1]',
      // Addresses no donor's browser reaches the site by.
      'https://10.0.0.5',
      'https://192.168.1.10',
      'https://169.254.169.254',
      'https://intranet',
      'https://impactafricaalliance.org.',
    ]) {
      expect(() => productionWith({ PUBLIC_SITE_URL: siteUrl }), siteUrl).toThrow(SITE_URL_REFUSED);
    }
  });

  it('refuses anything after the address, which would travel to Paystack with it', () => {
    for (const siteUrl of [
      'https://user:pass@impactafricaalliance.org',
      'https://impactafricaalliance.org/#frag',
      'https://impactafricaalliance.org/?next=https://evil.example',
      'https://impactafricaalliance.org?',
      'https://impactafricaalliance.org/donate',
      'https://impactafricaalliance.org//',
      'https://impactafricaalliance.org\\@evil.example',
    ]) {
      expect(() => productionWith({ PUBLIC_SITE_URL: siteUrl }), siteUrl).toThrow(SITE_URL_REFUSED);
    }
  });

  it('accepts the site’s address however its scheme and name are written', () => {
    for (const siteUrl of [
      'https://impactafricaalliance.org',
      'https://impactafricaalliance.org/',
      'HTTPS://ImpactAfricaAlliance.ORG',
      'https:impactafricaalliance.org',
      'https://impactafricaalliance.org:8443',
    ]) {
      expect(productionWith({ PUBLIC_SITE_URL: siteUrl }).siteUrl, siteUrl).toBe(siteUrl);
    }
  });

  it('may be a local address outside production', () => {
    expect(loadConfig(base as NodeJS.ProcessEnv).siteUrl).toBe('http://localhost:5173');
  });

  it('names every problem at once', () => {
    expect(() =>
      productionWith({
        CORS_ORIGINS: ' , ',
        PUBLIC_SITE_URL: 'http://localhost:5173',
        PAYSTACK_API_URL: 'http://localhost:4401',
      }),
    ).toThrow(
      [
        'Invalid environment configuration:',
        '  - CORS_ORIGINS is required in production',
        "  - PUBLIC_SITE_URL must be just the site's public https address (like https://impactafricaalliance.org) in production",
        '  - PAYSTACK_API_URL must be https://api.paystack.co in production',
      ].join('\n'),
    );
  });
});
