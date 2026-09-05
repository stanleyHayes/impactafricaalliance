import type { ImpactStat, Paginated } from '@iaa/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImpactStats } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import { ImpactMetrics, ImpactMetricsGrid } from './ImpactMetrics';

vi.mock('../lib/content-hooks', () => ({ useImpactStats: vi.fn() }));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

const metric = (index: number, overrides: Partial<ImpactStat> = {}): ImpactStat => ({
  id: `metric-${index}`,
  key: `community-metric-${index}`,
  label: `Community metric ${index}`,
  value: index * 10,
  suffix: '+',
  order: index,
  isActive: true,
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
  ...overrides,
});

const statsResponse = (items: ImpactStat[]): Paginated<ImpactStat> => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: Math.max(1, Math.ceil(items.length / 20)),
});

const mockStats = (
  items: ImpactStat[],
  overrides: Partial<ReturnType<typeof useImpactStats>> = {},
): void => {
  vi.mocked(useImpactStats).mockReturnValue({
    data: statsResponse(items),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useImpactStats>);
};

describe('ImpactMetrics', () => {
  beforeEach(() => {
    vi.mocked(useImpactStats).mockReset();
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('announces skeleton loading without displaying invented figures', () => {
    mockStats([], { data: undefined, isLoading: true });

    renderWithProviders(<ImpactMetrics />);

    expect(screen.getByRole('status', { name: 'Loading impact figures' })).toBeInTheDocument();
    expect(screen.queryByText('Impact updates are on the way.')).not.toBeInTheDocument();
    expect(screen.queryByText('200+')).not.toBeInTheDocument();
  });

  it('shows an honest empty state when no active metrics have been published', () => {
    mockStats([metric(1, { isActive: false })]);

    renderWithProviders(<ImpactMetrics />);

    expect(screen.getByText('Impact updates are on the way.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('keeps active metrics in API order, including zero values and newly added categories', () => {
    mockStats([
      metric(4, { label: 'Newly formed chapters', value: 0, suffix: '', order: 90 }),
      metric(2, { label: 'Hidden metric', isActive: false }),
      metric(1, { label: 'Local mentors', order: 2 }),
    ]);

    renderWithProviders(<ImpactMetrics />);

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(within(articles[0]!).getByText('Newly formed chapters')).toBeInTheDocument();
    expect(within(articles[0]!).getByText('0')).toBeInTheDocument();
    expect(within(articles[1]!).getByText('Local mentors')).toBeInTheDocument();
    expect(screen.queryByText('Hidden metric')).not.toBeInTheDocument();
  });

  it('renders the entire paginated collection without a page-specific item limit', () => {
    const items = Array.from({ length: 41 }, (_, index) => metric(index));
    mockStats(items);

    renderWithProviders(<ImpactMetrics />);

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(items.length);
    for (const [index, item] of items.entries()) {
      expect(within(articles[index]!).getByText(item.label)).toBeInTheDocument();
    }
  });

  it('offers a retry after a loading failure without showing fallback figures', async () => {
    const refetch = vi.fn();
    mockStats([], { data: undefined, isError: true, refetch });
    const user = userEvent.setup();

    renderWithProviders(<ImpactMetrics />);

    expect(screen.getByText('Impact figures are unavailable right now.')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText('Impact updates are on the way.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('updates the collection when dashboard metrics are added, removed, or reordered', () => {
    const items = Array.from({ length: 5 }, (_, index) => metric(index));
    mockStats(items.slice(0, 2));
    const { rerender } = renderWithProviders(<ImpactMetrics />);
    expect(screen.getAllByRole('article')).toHaveLength(2);

    mockStats(items);
    rerender(<ImpactMetrics />);
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.getByText('Community metric 4')).toBeInTheDocument();

    mockStats([items[4]!, items[0]!]);
    rerender(<ImpactMetrics />);
    const reordered = screen.getAllByRole('article');
    expect(within(reordered[0]!).getByText('Community metric 4')).toBeInTheDocument();
    expect(within(reordered[1]!).getByText('Community metric 0')).toBeInTheDocument();

    mockStats([items[4]!]);
    rerender(<ImpactMetrics />);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Community metric 4')).toBeInTheDocument();
    expect(screen.queryByText('Community metric 0')).not.toBeInTheDocument();
  });
});

describe('ImpactMetricsGrid', () => {
  it('includes a decorative, non-interactive SVG watermark on every metric', () => {
    const items = [
      metric(1, { key: 'youth-trained' }),
      metric(2, { key: 'countries' }),
      metric(3, { key: 'women-empowered' }),
      metric(4, { key: 'brand-new-category' }),
    ];

    renderWithProviders(<ImpactMetricsGrid stats={items} />);

    for (const article of screen.getAllByRole('article')) {
      const watermark = article.querySelector('svg[data-impact-watermark]');
      expect(watermark).toBeInTheDocument();
      expect(watermark).toHaveAttribute('aria-hidden', 'true');
      expect(watermark).toHaveAttribute('focusable', 'false');
    }
  });
});
