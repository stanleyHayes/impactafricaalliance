import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from './analytics.service.js';
import { PageViewModel } from './page-view.model.js';

/** Only the two fields the service actually reads. */
const config = {
  jwt: { accessSecret: 'a'.repeat(32) },
  siteUrl: 'https://www.impactafricaalliance.org',
} as unknown as ConstructorParameters<typeof AnalyticsService>[0];

const build = () => {
  const created: Record<string, unknown>[] = [];
  vi.spyOn(PageViewModel, 'create').mockImplementation(((doc: Record<string, unknown>) => {
    created.push(doc);
    return Promise.resolve(doc as never);
  }) as never);
  return { service: new AnalyticsService(config), created };
};

const CHROME_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

afterEach(() => vi.restoreAllMocks());

describe('what a page view records', () => {
  it('keeps the path but never the query string', async () => {
    const { service, created } = build();

    await service.record(
      { path: '/events/webinar?utm_source=whatsapp&email=ama@example.com' },
      { ip: '1.2.3.4', userAgent: CHROME_DESKTOP },
    );

    // Campaign tags and, on a bad day, somebody's address ride along in a
    // query string. None of it belongs in a traffic table.
    expect(created[0]?.path).toBe('/events/webinar');
  });

  it('keeps the referring host but not the page they came from', async () => {
    const { service, created } = build();

    await service.record(
      { path: '/', referrer: 'https://www.linkedin.com/feed/update/12345' },
      { userAgent: CHROME_DESKTOP },
    );

    expect(created[0]?.referrerHost).toBe('linkedin.com');
  });

  it('does not count our own pages as referrals', async () => {
    const { service, created } = build();

    await service.record(
      { path: '/about', referrer: 'https://www.impactafricaalliance.org/events' },
      { userAgent: CHROME_DESKTOP },
    );

    expect(created[0]?.referrerHost).toBeUndefined();
  });

  it('tells a phone from a computer', async () => {
    const { service, created } = build();

    await service.record({ path: '/' }, { userAgent: SAFARI_IPHONE });
    await service.record({ path: '/' }, { userAgent: CHROME_DESKTOP });

    expect(created[0]).toMatchObject({ device: 'mobile', browser: 'Safari', os: 'iOS' });
    expect(created[1]).toMatchObject({ device: 'desktop', browser: 'Chrome', os: 'macOS' });
  });

  it('never writes down the address it was given', async () => {
    const { service, created } = build();

    await service.record({ path: '/' }, { ip: '41.202.219.7', userAgent: CHROME_DESKTOP });

    expect(JSON.stringify(created[0])).not.toContain('41.202.219.7');
    expect(created[0]?.visitorHash).toEqual(expect.any(String));
  });

  it('counts one person once a day, and cannot follow them to the next', async () => {
    const { service, created } = build();
    const visitor = { ip: '41.202.219.7', userAgent: CHROME_DESKTOP };

    await service.record({ path: '/' }, visitor, new Date('2026-09-08T08:00:00Z'));
    await service.record({ path: '/about' }, visitor, new Date('2026-09-08T21:00:00Z'));
    await service.record({ path: '/' }, visitor, new Date('2026-09-09T08:00:00Z'));

    // Same day, same person: one visitor. Next day: a value that cannot be
    // tied back to yesterday's, so nobody is followed across days.
    expect(created[0]?.visitorHash).toBe(created[1]?.visitorHash);
    expect(created[2]?.visitorHash).not.toBe(created[0]?.visitorHash);
  });

  it('records the hour so the day can be read back', async () => {
    const { service, created } = build();

    await service.record({ path: '/' }, { userAgent: CHROME_DESKTOP }, new Date('2026-09-08T14:30:00Z'));

    expect(created[0]?.hourUtc).toBe(14);
  });
});
