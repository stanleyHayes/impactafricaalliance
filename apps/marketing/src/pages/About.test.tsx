import type { ImpactStat, Paginated } from '@iaa/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useImpactStats } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import { AboutIntro } from './About';

vi.mock('../lib/content-hooks', () => ({
  useImpactStats: vi.fn(),
  usePageCopy: vi.fn(),
  usePartners: vi.fn(),
  useTeam: vi.fn(),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

describe('AboutIntro', () => {
  it('preserves the introduction and shows every CMS metric beyond the original three', () => {
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
    const items: ImpactStat[] = Array.from({ length: 5 }, (_, index) => ({
      id: `metric-${index}`,
      key: `custom-metric-${index}`,
      label: `Community metric ${index}`,
      value: index * 10,
      suffix: '+',
      order: index,
      isActive: true,
      createdAt: '2026-09-05T00:00:00.000Z',
      updatedAt: '2026-09-05T00:00:00.000Z',
    }));
    const data: Paginated<ImpactStat> = {
      items,
      page: 1,
      pageSize: 20,
      total: items.length,
      totalPages: 1,
    };
    vi.mocked(useImpactStats).mockReturnValue({
      data,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useImpactStats>);

    renderWithProviders(<AboutIntro />);

    expect(
      screen.getByRole('heading', {
        name: "Architects of Africa's transformation, not observers of it.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Impact Africa Alliance community gathering' }),
    ).toBeInTheDocument();
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(5);
    expect(within(articles[4]!).getByText('Community metric 4')).toBeInTheDocument();
  });
});
