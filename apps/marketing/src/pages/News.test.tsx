import type { Article, Paginated } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useArticles } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import News from './News';

vi.mock('../lib/content-hooks', () => ({
  useArticles: vi.fn(),
  usePageCopy: vi.fn((_pageKey: string, fallback: unknown) => fallback),
  useSiteImages: () => ({ data: { items: [] } }),
}));

const mockUseArticles = vi.mocked(useArticles);

const asResult = (over: Record<string, unknown>): ReturnType<typeof useArticles> =>
  ({
    data: undefined,
    isLoading: false,
    isError: false,
    ...over,
  }) as ReturnType<typeof useArticles>;

const emptyPage: Paginated<Article> = { items: [], total: 0, page: 1, pageSize: 9, totalPages: 0 };

describe('News', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guides the visitor somewhere useful when nothing is published yet', () => {
    mockUseArticles.mockReturnValue(asResult({ data: emptyPage }));

    renderWithProviders(<News />);

    expect(screen.getByText('Nothing published yet')).toBeInTheDocument();
    expect(screen.getByText('The first stories are being written.')).toBeInTheDocument();

    // The point of the empty state: it must offer a way onward, not dead-end.
    expect(screen.getByRole('link', { name: /explore our work/i })).toHaveAttribute(
      'href',
      '/our-work',
    );
    expect(screen.getByRole('link', { name: /get involved/i })).toHaveAttribute(
      'href',
      '/get-involved',
    );
  });

  it('keeps the empty state distinct from a load failure', () => {
    mockUseArticles.mockReturnValue(asResult({ isError: true }));

    renderWithProviders(<News />);

    expect(screen.getByText(/couldn.t load the news right now/i)).toBeInTheDocument();
    expect(screen.queryByText('Nothing published yet')).not.toBeInTheDocument();
  });
});
