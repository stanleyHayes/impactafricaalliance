import type { SiteImage } from '@iaa/shared';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSiteImages } from './content-hooks';
import {
  bannerImageUrl,
  useDefaultShareImage,
  useShowcaseImageMap,
  useSiteImage,
  useSiteImageDetails,
} from './site-images';

vi.mock('./content-hooks', () => ({ useSiteImages: vi.fn() }));

const UPLOAD = 'https://res.cloudinary.com/demo/image/upload/v1/site/editor-upload.jpg';

const record = (key: string, overrides: Partial<SiteImage> = {}): SiteImage => ({
  id: `id-${key}`,
  key,
  isActive: true,
  image: { url: UPLOAD, publicId: 'site/editor-upload', alt: 'Media description' },
  alt: 'Editor description',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

/** What the site-images request has come back with, or `undefined` while it is loading or failed. */
const serve = (items: SiteImage[] | undefined): void => {
  vi.mocked(useSiteImages).mockReturnValue({
    data: items ? { items, page: 1, pageSize: 100, total: items.length, totalPages: 1 } : undefined,
  } as ReturnType<typeof useSiteImages>);
};

describe('a site image slot', () => {
  it('draws the shipped image while the API is asleep or the dashboard is empty', () => {
    for (const items of [undefined, []]) {
      serve(items);
      expect(renderHook(() => useSiteImage('contact-hero')).result.current).toBe(
        '/images/program-stem-learning.webp',
      );
      expect(renderHook(() => useSiteImage('events-hero')).result.current).toBe(
        '/images/team-alliance-artwork.webp',
      );
    }
  });

  it('draws the dashboard’s picture once one is uploaded and switched on', () => {
    serve([record('contact-hero')]);
    expect(renderHook(() => useSiteImage('contact-hero')).result.current).toBe(UPLOAD);
    serve([record('contact-hero', { isActive: false })]);
    expect(renderHook(() => useSiteImage('contact-hero')).result.current).toBe(
      '/images/program-stem-learning.webp',
    );
  });

  it('keeps sharing the default banner’s upload until a page is given its own', () => {
    serve([record('community')]);
    expect(renderHook(() => useSiteImage('reviews-hero')).result.current).toBe(UPLOAD);
    // About never shared it, so it keeps its own photograph.
    expect(renderHook(() => useSiteImage('about-hero')).result.current).toBe(
      '/images/community.webp',
    );
  });

  it('describes the shipped picture in the catalogue’s words and an upload in the editor’s', () => {
    serve([]);
    expect(renderHook(() => useSiteImageDetails('about-intro')).result.current.alt).toBe(
      'Impact Africa Alliance community gathering',
    );
    serve([record('about-intro')]);
    expect(renderHook(() => useSiteImageDetails('about-intro')).result.current.alt).toBe(
      'Editor description',
    );
  });
});

describe('showcase CMS images', () => {
  const resolve = (items: SiteImage[]) => {
    serve(items);
    return renderHook(() => useShowcaseImageMap()).result.current('home-showcase-lead');
  };

  it('uses the active CMS image and its description', () => {
    expect(resolve([record('home-showcase-lead')])).toMatchObject({
      src: UPLOAD,
      alt: 'Editor description',
    });
  });

  it('uses media alt text when the slot description is blank', () => {
    expect(resolve([record('home-showcase-lead', { alt: ' ' })]).alt).toBe('Media description');
  });

  it('restores the generated fallback and its description when a slot is absent or inactive', () => {
    for (const items of [[], [record('home-showcase-lead', { isActive: false })]]) {
      expect(resolve(items)).toMatchObject({
        src: '/images/home-showcase-lead-v2.webp',
        alt: 'AI-generated illustration of young adults collaborating on digital skills at a laptop',
      });
    }
  });
});

describe('a showcase photo that will not load', () => {
  it('carries the shipped photo and its description to fall back to', () => {
    serve([record('home-showcase-lead')]);
    const panel = renderHook(() => useShowcaseImageMap()).result.current('home-showcase-lead');
    expect(panel.fallback).toEqual({
      src: '/images/home-showcase-lead-v2.webp',
      alt: 'AI-generated illustration of young adults collaborating on digital skills at a laptop',
    });
  });
});

describe('the default link preview', () => {
  it('is the brand card, as a full address, until one is uploaded', () => {
    serve(undefined);
    expect(renderHook(() => useDefaultShareImage()).result.current).toEqual({
      url: 'https://www.impactafricaalliance.org/brand/og-image.png',
      alt: 'Impact Africa Alliance — Empowering Africa. One Community at a Time.',
    });
  });

  it('is the uploaded picture at share-card width once there is one', () => {
    serve([record('social-share-default')]);
    expect(renderHook(() => useDefaultShareImage()).result.current.url).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1200/v1/site/editor-upload.jpg',
    );
  });
});

describe('banner addresses', () => {
  it('leave a shipped file exactly as it was, and ask Cloudinary for a sized copy', () => {
    expect(bannerImageUrl('/images/community.webp')).toBe('/images/community.webp');
    expect(bannerImageUrl(UPLOAD)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1920/v1/site/editor-upload.jpg',
    );
  });
});
