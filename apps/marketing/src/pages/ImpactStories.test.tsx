import type { Paginated, PublicImpactStoryListItem } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  useImpactStories,
  useImpactStoryFacets,
  type ImpactStoryFilters,
} from '../features/impact-stories/api';
import { renderWithProviders } from '../test/test-utils';
import { theme } from '../theme/theme';

import ImpactStories from './ImpactStories';

vi.mock('../features/impact-stories/api', () => ({
  STORIES_PAGE_SIZE: 9,
  useImpactStories: vi.fn(),
  useImpactStoryFacets: vi.fn(),
}));
vi.mock('../lib/site-images', () => ({ useSiteImage: () => '/images/hero.jpg' }));

const story = (
  index: number,
  overrides: Partial<PublicImpactStoryListItem> = {},
): PublicImpactStoryListItem => ({
  id: `story-${index}`,
  title: `Story number ${index}`,
  slug: `story-${index}`,
  excerpt: 'How a programme changed a community.',
  tags: [],
  publishedAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-02T12:00:00.000Z',
  ...overrides,
});

const pageOf = (
  items: PublicImpactStoryListItem[],
  page: number,
  total: number,
): Paginated<PublicImpactStoryListItem> => ({
  items,
  page,
  pageSize: 9,
  total,
  totalPages: Math.max(1, Math.ceil(total / 9)),
});

type Result = ReturnType<typeof useImpactStories>;

const ready = (data: Paginated<PublicImpactStoryListItem>): Result =>
  ({ data, isPending: false, isError: false, isFetching: false }) as unknown as Result;

const mockPages = (pages: Record<number, Paginated<PublicImpactStoryListItem>>): void => {
  vi.mocked(useImpactStories).mockImplementation((_filters: ImpactStoryFilters, page: number) =>
    ready(pages[page] ?? pageOf([], page, 0)),
  );
};

const mockFacets = (items: PublicImpactStoryListItem[]): void => {
  vi.mocked(useImpactStoryFacets).mockReturnValue(
    ready(pageOf(items, 1, items.length)) as ReturnType<typeof useImpactStoryFacets>,
  );
};

afterEach(() => vi.clearAllMocks());

describe('ImpactStories', () => {
  it('says stories appear once published when there are none', () => {
    mockFacets([]);
    mockPages({ 1: pageOf([], 1, 0) });
    renderWithProviders(<ImpactStories />);

    expect(screen.getByRole('heading', { name: 'Stories are on their way' })).toBeInTheDocument();
    expect(screen.getByText(/Stories appear here once they are published/)).toBeInTheDocument();
    // No stories, no filters to offer.
    expect(screen.queryByRole('group', { name: 'Programme' })).not.toBeInTheDocument();
  });

  it('offers only the filters the published stories carry', () => {
    const stories = [
      story(1, { programme: 'digital-skills', country: 'Ghana' }),
      story(2, { country: 'Kenya' }),
    ];
    mockFacets(stories);
    mockPages({ 1: pageOf(stories, 1, 2) });
    renderWithProviders(<ImpactStories />);

    const programmes = screen.getByRole('group', { name: 'Programme' });
    expect(programmes).toHaveTextContent('Digital Skills & Innovation Hub');
    expect(screen.getByRole('group', { name: 'Country' })).toHaveTextContent('GhanaKenya');

    fireEvent.click(screen.getByRole('button', { name: 'Kenya' }));
    expect(vi.mocked(useImpactStories)).toHaveBeenLastCalledWith(
      { programme: '', country: 'Kenya' },
      expect.any(Number),
    );
  });

  it('shows every story for a programme the site does not know, rather than an error', () => {
    mockFacets([story(1)]);
    mockPages({ 1: pageOf([story(1)], 1, 1) });
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/impact/stories?programme=retired-pillar&country=Ghana']}>
          <ImpactStories />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(vi.mocked(useImpactStories)).toHaveBeenLastCalledWith(
      { programme: '', country: 'Ghana' },
      expect.any(Number),
    );
  });

  it('offers a retry when a later page fails to load', () => {
    const first = Array.from({ length: 9 }, (_, index) => story(index + 1));
    const refetch = vi.fn();
    mockFacets(first);
    vi.mocked(useImpactStories).mockImplementation((_filters: ImpactStoryFilters, page: number) =>
      page === 1
        ? ready(pageOf(first, 1, 11))
        : ({
            data: undefined,
            isPending: false,
            isError: true,
            isFetching: false,
            refetch,
          } as unknown as Result),
    );
    renderWithProviders(<ImpactStories />);

    fireEvent.click(screen.getByRole('button', { name: 'Load more stories' }));

    expect(screen.getByRole('alert')).toHaveTextContent('More stories could not be loaded.');
    expect(screen.getByText('Showing 9 of 11 stories')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('pages through stories with Load more', () => {
    const first = Array.from({ length: 9 }, (_, index) => story(index + 1));
    const second = [story(10), story(11)];
    mockFacets([...first, ...second]);
    mockPages({ 1: pageOf(first, 1, 11), 2: pageOf(second, 2, 11) });
    renderWithProviders(<ImpactStories />);

    expect(screen.getAllByRole('link', { name: /^Read Story number/ })).toHaveLength(9);
    expect(screen.getByText('Showing 9 of 11 stories')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load more stories' }));

    expect(screen.getAllByRole('link', { name: /^Read Story number/ })).toHaveLength(11);
    expect(screen.getByText('Showing 11 of 11 stories')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more stories' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Read Story number 10' })).toHaveAttribute(
      'href',
      '/impact/stories/story-10',
    );
  });
});
