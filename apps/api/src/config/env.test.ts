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
  JWT_ACCESS_SECRET: 'access-secret-access-secret-access-secret-0123',
  JWT_REFRESH_SECRET: 'refresh-secret-refresh-secret-refresh-secret-01',
  MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
};

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
    expect(() =>
      loadConfig({ ...production, PAYSTACK_API_URL: 'http://localhost:4401' } as NodeJS.ProcessEnv),
    ).toThrow(/PAYSTACK_API_URL must use https/);
    expect(loadConfig(production as NodeJS.ProcessEnv).paystack.apiUrl).toBe(
      'https://api.paystack.co',
    );
  });
});
