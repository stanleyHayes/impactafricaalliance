import type { ImpactStat, Paginated } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImpactStats } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import { HomeImpactSection } from './Home';

vi.mock('../lib/content-hooks', () => ({
  useArticles: vi.fn(),
  useImpactStats: vi.fn(),
  useStories: vi.fn(),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

const now = '2026-06-13T00:00:00.000Z';
const stats: ImpactStat[] = [
  {
    id: '1',
    key: 'youth-trained',
    label: 'Young people trained',
    value: 1200,
    suffix: '+',
    order: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '2',
    key: 'countries',
    label: 'Countries reached',
    value: 5,
    suffix: '',
    order: 2,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '3',
    key: 'community-projects',
    label: 'Community projects',
    value: 32,
    suffix: '',
    order: 3,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

const paginated = (items: ImpactStat[]): Paginated<ImpactStat> => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: 1,
});

const mockImpactStats = (items: ImpactStat[]): void => {
  vi.mocked(useImpactStats).mockReturnValue({
    data: paginated(items),
    isLoading: false,
  } as ReturnType<typeof useImpactStats>);
};

describe('HomeImpactSection', () => {
  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string): MediaQueryList =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    );
  });

  it('renders the impact narrative and every CMS metric', () => {
    mockImpactStats(stats);

    renderWithProviders(<HomeImpactSection />);

    expect(
      screen.getByRole('region', { name: 'Progress you can see. Change people can feel.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByText('1,200+')).toBeInTheDocument();
    expect(screen.getByText('Community projects')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore our full impact' })).toHaveAttribute(
      'href',
      '/impact',
    );
  });

  it('renders nothing when no impact metrics are published', () => {
    mockImpactStats([]);

    const { container } = renderWithProviders(<HomeImpactSection />);

    expect(container).toBeEmptyDOMElement();
  });
});
