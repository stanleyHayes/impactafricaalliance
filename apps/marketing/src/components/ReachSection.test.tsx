import type { PublicReachSummary } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePublicReach } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import { ReachSection } from './ReachSection';

vi.mock('../lib/content-hooks', () => ({ usePublicReach: vi.fn() }));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

const reach = (overrides: Partial<PublicReachSummary> = {}): PublicReachSummary => ({
  days: 30,
  totalViews: 12_400,
  totalVisitors: 3_180,
  countryCount: 31,
  topCountries: [
    { key: 'GH', label: 'Ghana', count: 5_100 },
    { key: 'NG', label: 'Nigeria', count: 3_900 },
  ],
  daily: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, '0')}`,
    views: 300 + index,
    visitors: 90 + index,
  })),
  generatedAt: '2026-09-08T00:00:00.000Z',
  ...overrides,
});

const render = (data: PublicReachSummary | undefined, isLoading = false): void => {
  vi.mocked(usePublicReach).mockReturnValue({ data, isLoading } as ReturnType<
    typeof usePublicReach
  >);
  renderWithProviders(<ReachSection />);
};

describe('the public reach card', () => {
  it('puts the figures where a partner can read them', () => {
    render(reach());

    expect(screen.getByText('12,400')).toBeInTheDocument();
    expect(screen.getByText('3,180')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText(/Ghana · Nigeria/)).toBeInTheDocument();
  });

  it('offers the figures as something shareable, not just readable', () => {
    render(reach());

    expect(screen.getByRole('button', { name: /Share these figures/ })).toBeInTheDocument();
  });

  it('says nothing at all until the numbers mean something', () => {
    // Forty views is a quiet week, not a reach story. Showing it would make
    // the organisation look smaller than saying nothing.
    render(reach({ totalViews: 40 }));

    expect(screen.queryByRole('button', { name: /Share these figures/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Our reach')).not.toBeInTheDocument();
  });

  it('stays quiet when the figures cannot be loaded', () => {
    render(undefined);

    expect(screen.queryByText('Our reach')).not.toBeInTheDocument();
  });
});
