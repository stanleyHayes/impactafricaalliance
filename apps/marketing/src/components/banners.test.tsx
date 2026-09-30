import type { ImpactStat, Paginated, SiteImage } from '@iaa/shared';
import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useArticles, useImpactStats, usePageCopy, useSiteImages } from '../lib/content-hooks';
import { AboutIntro } from '../pages/About';
import News from '../pages/News';
import { findBackground, renderWithProviders } from '../test/test-utils';

import { PageHero } from './PageHero';

vi.mock('../lib/content-hooks', () => ({
  useArticles: vi.fn(),
  useImpactStats: vi.fn(),
  usePageCopy: vi.fn(),
  useSiteImages: vi.fn(),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

const UPLOAD = 'https://res.cloudinary.com/demo/image/upload/v1/site/banner.jpg';
/** The upload as a banner asks Cloudinary for it. */
const SIZED_UPLOAD = 'f_auto,q_auto,c_limit,w_1920/v1/site/banner.jpg';

const upload = (key: string, overrides: Partial<SiteImage> = {}): SiteImage => ({
  id: key,
  key,
  image: { url: UPLOAD, publicId: 'site/banner' },
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

/** The dashboard's uploads, or `undefined` for an API that is asleep. */
const serve = (items: SiteImage[] | undefined): void => {
  vi.mocked(useSiteImages).mockReturnValue({
    data: items ? { items, page: 1, pageSize: 100, total: items.length, totalPages: 1 } : undefined,
  } as ReturnType<typeof useSiteImages>);
};

beforeEach(() => {
  vi.mocked(usePageCopy).mockImplementation((_key, defaults) => defaults);
  const empty: Paginated<never> = { items: [], total: 0, page: 1, pageSize: 9, totalPages: 0 };
  vi.mocked(useArticles).mockReturnValue({
    data: empty,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useArticles>);
  vi.mocked(useImpactStats).mockReturnValue({
    data: { items: [] as ImpactStat[] },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useImpactStats>);
});

/** The browser's image loader, reporting every address it is asked for as unloadable. */
const breakEveryUpload = (): (() => void) => {
  const probes: { onerror: (() => void) | null }[] = [];
  vi.stubGlobal(
    'Image',
    class {
      onerror: (() => void) | null = null;
      src = '';
      constructor() {
        probes.push(this);
      }
    },
  );
  return () => act(() => probes.forEach((probe) => probe.onerror?.()));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a page banner', () => {
  it('draws its slot’s shipped image while the dashboard is empty or asleep', () => {
    for (const items of [undefined, []]) {
      serve(items);
      const { container, unmount } = renderWithProviders(
        <PageHero title="Events" slot="events-hero" />,
      );
      expect(findBackground(container, '/images/team-alliance-artwork.webp')).toBeDefined();
      unmount();
    }
  });

  it('falls back to the default page banner when a page names no slot', () => {
    serve([]);
    const { container } = renderWithProviders(<PageHero title="Somewhere" />);
    expect(findBackground(container, '/images/community.webp')).toBeDefined();
  });

  it('draws the slot’s upload, sized for a banner', () => {
    serve([upload('events-hero')]);
    const { container } = renderWithProviders(<PageHero title="Events" slot="events-hero" />);
    expect(findBackground(container, SIZED_UPLOAD)).toBeDefined();
  });

  it('lets a picture of the page’s own win over the slot', () => {
    serve([upload('events-hero')]);
    const { container } = renderWithProviders(
      <PageHero title="Events" slot="events-hero" image="https://example.org/page-setting.jpg" />,
    );
    expect(findBackground(container, 'https://example.org/page-setting.jpg')).toBeDefined();
    expect(findBackground(container, SIZED_UPLOAD)).toBeUndefined();
  });
});

describe('a banner whose upload will not load', () => {
  it('draws the shipped image instead of a blank block, even under a Page Settings image', () => {
    const fail = breakEveryUpload();
    serve([upload('events-hero')]);
    const { container } = renderWithProviders(
      <PageHero title="Events" slot="events-hero" image="https://example.org/page-setting.jpg" />,
    );
    expect(findBackground(container, 'https://example.org/page-setting.jpg')).toBeDefined();
    fail();
    fail();
    expect(findBackground(container, '/images/team-alliance-artwork.webp')).toBeDefined();
  });

  it('quotes the address, so a bracket in it cannot end the background early', () => {
    serve([
      upload('events-hero', {
        image: { url: 'https://example.org/a).jpg', publicId: 'odd' },
      }),
    ]);
    const { container } = renderWithProviders(<PageHero title="Events" slot="events-hero" />);
    expect(findBackground(container, 'url("https://example.org/a).jpg")')).toBeDefined();
  });
});

describe('the News banner', () => {
  it('uses its own slot, and the default banner it shared until it had one', () => {
    serve([upload('community')]);
    const shared = renderWithProviders(<News />);
    expect(findBackground(shared.container, SIZED_UPLOAD)).toBeDefined();
    shared.unmount();

    const ownUpload = upload('news-hero', {
      image: {
        url: 'https://res.cloudinary.com/demo/image/upload/v1/site/news.jpg',
        publicId: 'n',
      },
    });
    serve([upload('community'), ownUpload]);
    const own = renderWithProviders(<News />);
    expect(findBackground(own.container, 'v1/site/news.jpg')).toBeDefined();
    expect(findBackground(own.container, SIZED_UPLOAD)).toBeUndefined();
  });
});

describe('the About introduction photograph', () => {
  it('is the shipped photograph with its description until one is uploaded', () => {
    serve(undefined);
    renderWithProviders(<AboutIntro />);
    expect(
      screen.getByRole('img', { name: 'Impact Africa Alliance community gathering' }),
    ).toHaveAttribute('src', '/images/community.webp');
  });

  it('is the upload, offered at every width, with the editor’s description', () => {
    serve([upload('about-intro', { alt: 'Volunteers at a workshop in Accra' })]);
    renderWithProviders(<AboutIntro />);
    const photo = screen.getByRole('img', { name: 'Volunteers at a workshop in Accra' });
    expect(photo.getAttribute('src')).toContain('w_1080/v1/site/banner.jpg');
    expect(photo.getAttribute('srcset')).toContain('w_1920/v1/site/banner.jpg 1920w');
  });

  it('goes back to the shipped photograph and its description when the upload will not load', () => {
    serve([upload('about-intro', { alt: 'Volunteers at a workshop in Accra' })]);
    renderWithProviders(<AboutIntro />);
    fireEvent.error(screen.getByRole('img', { name: 'Volunteers at a workshop in Accra' }));
    const photo = screen.getByRole('img', { name: 'Impact Africa Alliance community gathering' });
    expect(photo).toHaveAttribute('src', '/images/community.webp');
    expect(photo).not.toHaveAttribute('srcset');
  });
});
