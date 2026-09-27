import type { PublicImpactStory } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useImpactStory } from '../features/impact-stories/api';
import { ApiError } from '../lib/api-client';
import { theme } from '../theme/theme';

import ImpactStory from './ImpactStory';

vi.mock('../features/impact-stories/api', () => ({ useImpactStory: vi.fn() }));
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

const story: PublicImpactStory = {
  id: 'story-1',
  title: 'Girls in code',
  slug: 'girls-in-code',
  excerpt: 'How forty girls in Tamale wrote their first programs.',
  cover: {
    url: 'https://res.cloudinary.com/iaa/image/upload/v1/stories/cover.jpg',
    publicId: 'iaa/stories/cover',
    alt: 'Girls at a laptop',
  },
  blocks: [
    {
      id: 'hero',
      type: 'hero',
      data: { heading: 'Girls in code', subheading: 'A year of clubs.' },
    },
    { id: 'text', type: 'rich-text', data: { markdown: 'It began with a borrowed laptop.' } },
  ],
  tags: ['education'],
  country: 'Ghana',
  programme: 'digital-skills',
  seo: { title: 'Girls in code: a year in Tamale' },
  publishedAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-03T12:00:00.000Z',
};

type Result = ReturnType<typeof useImpactStory>;

const mockStory = (result: Partial<Result>): void => {
  vi.mocked(useImpactStory).mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...result,
  } as unknown as Result);
};

const renderPage = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/impact/stories/girls-in-code']}>
        <Routes>
          <Route path="/impact/stories/:slug" element={<ImpactStory />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
};

const meta = (selector: string): string | null =>
  document.head.querySelector(selector)?.getAttribute('content') ?? null;

/**
 * Every value the stylesheets give `property` in rules aimed at one of the
 * element's own classes, media rules included, as Emotion writes them.
 */
const declared = (element: Element, property: string): string[] => {
  const selectors = new Set([...element.classList].map((name) => `.${name}`));
  return [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .flatMap((rule) => (rule instanceof CSSMediaRule ? [...rule.cssRules] : [rule]))
    .filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && selectors.has(rule.selectorText),
    )
    .map((rule) => rule.style.getPropertyValue(property))
    .filter(Boolean);
};

afterEach(() => {
  vi.clearAllMocks();
  document.head.querySelector('meta[name="robots"]')?.remove();
});

describe('ImpactStory', () => {
  it('renders the story with article metadata and Article JSON-LD', async () => {
    mockStory({ data: story });
    renderPage();

    expect(useImpactStory).toHaveBeenCalledWith('girls-in-code');
    expect(screen.getByRole('heading', { level: 1, name: 'Girls in code' })).toBeInTheDocument();
    expect(screen.getByText('It began with a borrowed laptop.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Share on LinkedIn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'More stories' })).toHaveAttribute(
      'href',
      '/impact/stories',
    );

    await waitFor(() =>
      expect(document.title).toBe('Girls in code: a year in Tamale | Impact Africa Alliance'),
    );
    expect(meta('meta[property="og:type"]')).toBe('article');
    expect(meta('meta[property="og:image"]')).toMatch(/^https:\/\/res\.cloudinary\.com\/.*w_1200/);
    expect(meta('meta[name="robots"]')).toBeNull();

    const script = document.getElementById('iaa-story-schema');
    expect(script).not.toBeNull();
    const schema = JSON.parse(script?.textContent ?? '{}') as Record<string, unknown>;
    expect(schema).toMatchObject({
      '@type': 'Article',
      headline: 'Girls in code',
      datePublished: story.publishedAt,
      dateModified: story.updatedAt,
      publisher: { '@type': 'Organization', name: 'Impact Africa Alliance' },
    });
    expect((schema.image as string[])[0]).toMatch(/^https:\/\//);
  });

  it('shows a not-found page kept out of search results', async () => {
    mockStory({ isError: true, error: new ApiError(404, 'NOT_FOUND', 'Impact story not found') });
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Story not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See all impact stories' })).toHaveAttribute(
      'href',
      '/impact/stories',
    );
    await waitFor(() => expect(meta('meta[name="robots"]')).toBe('noindex, nofollow'));
    expect(document.getElementById('iaa-story-schema')).toBeNull();
  });

  it('treats an address that could never be a story as not found', () => {
    mockStory({ isError: true, error: new ApiError(400, 'VALIDATION_ERROR', 'Validation failed') });
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Story not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('offers a retry when the story could not be fetched', () => {
    const refetch = vi.fn();
    mockStory({ isError: true, error: new Error('Network error'), refetch } as Partial<Result>);
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'This story could not be loaded' }),
    ).toBeInTheDocument();
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the page shape while the story loads', () => {
    mockStory({ isPending: true });
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading the story' })).toBeInTheDocument();
  });

  it('loads in the shape of the dark opening hero, so nothing jumps when the story arrives', () => {
    mockStory({ isPending: true });
    renderPage();
    const band = screen.getByRole('status', { name: 'Loading the story' })
      .firstElementChild as HTMLElement;
    // The lead hero's deep forest colour and height, not a short mint band.
    expect(band).toHaveStyle({ backgroundColor: 'rgb(14, 42, 34)' });
    // jsdom ignores media rules, and MUI writes even the phone height inside
    // one, so read the heights the stylesheet declares for the band.
    expect(declared(band, 'min-height')).toEqual(['520px', '640px']);
  });
});
