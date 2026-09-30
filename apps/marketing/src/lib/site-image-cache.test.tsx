import type { Paginated, SiteImage } from '@iaa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet } from './api-client';
import { useSiteImages } from './content-hooks';
import { cacheSiteImages, readCachedSiteImages, SITE_IMAGE_CACHE_KEY } from './site-image-cache';

vi.mock('./api-client', () => ({ apiGet: vi.fn() }));

const QueryWrapper = ({ children }: { children: ReactNode }): JSX.Element => {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const record = (key: string, url: string): SiteImage => ({
  id: `id-${key}`,
  key,
  isActive: true,
  alt: 'Volunteers at a workshop',
  image: { url, publicId: key, alt: 'From the library' },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});

const page = (items: SiteImage[]): Paginated<SiteImage> => ({
  items,
  page: 1,
  pageSize: 100,
  total: items.length,
  totalPages: 1,
});

const LAST_VISIT = 'https://res.cloudinary.com/demo/image/upload/v1/site/last-visit.jpg';
const TODAY = 'https://res.cloudinary.com/demo/image/upload/v1/site/today.jpg';

beforeEach(() => {
  vi.mocked(apiGet).mockReset();
  // A storage of the test's own: jsdom's is missing under some Node versions.
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('remembering site images between visits', () => {
  it('keeps what the site draws and reads it back', () => {
    cacheSiteImages(page([record('home-hero', LAST_VISIT)]));
    expect(readCachedSiteImages()?.items).toEqual([record('home-hero', LAST_VISIT)]);
  });

  it('ignores anything in storage that is not a list of https pictures', () => {
    window.localStorage.setItem(SITE_IMAGE_CACHE_KEY, '{not json');
    expect(readCachedSiteImages()).toBeUndefined();
    window.localStorage.setItem(SITE_IMAGE_CACHE_KEY, JSON.stringify({ items: [] }));
    expect(readCachedSiteImages()).toBeUndefined();
    window.localStorage.setItem(
      SITE_IMAGE_CACHE_KEY,
      JSON.stringify([
        { key: 'home-hero', isActive: true, image: { url: 'javascript:alert(1)' } },
        { key: 'about-hero', isActive: true, image: { url: 'http://a.test/b.jpg' } },
        { isActive: true, image: { url: LAST_VISIT } },
        null,
      ]),
    );
    expect(readCachedSiteImages()?.items).toEqual([]);
  });

  it('starts from the defaults when storage is blocked', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readCachedSiteImages()).toBeUndefined();
    expect(() => cacheSiteImages(page([record('home-hero', TODAY)]))).not.toThrow();
  });
});

describe('the site images request', () => {
  it('draws last visit’s pictures at once, then whatever the API says now', async () => {
    cacheSiteImages(page([record('home-hero', LAST_VISIT)]));
    vi.mocked(apiGet).mockResolvedValue(page([record('home-hero', TODAY)]));

    const { result } = renderHook(() => useSiteImages(), { wrapper: QueryWrapper });
    // The first paint: no wait for the API, and no shipped picture first.
    expect(result.current.data?.items[0]?.image.url).toBe(LAST_VISIT);

    await waitFor(() => expect(result.current.data?.items[0]?.image.url).toBe(TODAY));
    expect(apiGet).toHaveBeenCalledWith('/site-images?pageSize=100');
    expect(readCachedSiteImages()?.items[0]?.image.url).toBe(TODAY);
  });

  it('keeps last visit’s pictures while the API is asleep', async () => {
    cacheSiteImages(page([record('home-hero', LAST_VISIT)]));
    vi.mocked(apiGet).mockRejectedValue(new Error('Could not reach the server'));

    const { result } = renderHook(() => useSiteImages(), { wrapper: QueryWrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data?.items[0]?.image.url).toBe(LAST_VISIT);
  });

  it('forgets a reset slot once the API has answered', async () => {
    cacheSiteImages(page([record('home-hero', LAST_VISIT)]));
    vi.mocked(apiGet).mockResolvedValue(page([]));

    const { result } = renderHook(() => useSiteImages(), { wrapper: QueryWrapper });
    await waitFor(() => expect(result.current.data?.items).toEqual([]));
    expect(readCachedSiteImages()?.items).toEqual([]);
  });
});
