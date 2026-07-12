import type { ImpactStat, Paginated, Report } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useImpactStats, useReports } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import { ImpactNumbersSection, ReportsSection, SdgSection } from './Impact';

vi.mock('../lib/content-hooks', () => ({
  useImpactStats: vi.fn(),
  useReports: vi.fn(),
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
    key: 'new-cms-metric',
    label: 'Community projects',
    value: 32,
    suffix: '',
    order: 3,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

const reports: Report[] = [
  {
    id: 'report-1',
    title: '2026 Impact Report',
    description: 'A transparent view of programme outcomes and learning.',
    year: 2026,
    file: { url: 'https://example.com/report.pdf', publicId: 'reports/2026' },
    status: 'published',
    order: 1,
    createdAt: now,
    updatedAt: now,
  },
];

const paginatedStats = (items: ImpactStat[]): Paginated<ImpactStat> => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: 1,
});

const paginatedReports = (items: Report[]): Paginated<Report> => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: 1,
});

const mockImpactStats = (items: ImpactStat[]): void => {
  vi.mocked(useImpactStats).mockReturnValue({
    data: paginatedStats(items),
    isLoading: false,
  } as ReturnType<typeof useImpactStats>);
};

const mockReports = (items: Report[]): void => {
  vi.mocked(useReports).mockReturnValue({
    data: paginatedReports(items),
    isLoading: false,
  } as ReturnType<typeof useReports>);
};

describe('ImpactNumbersSection', () => {
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

  it('renders the lead metric and any additional CMS metrics', () => {
    mockImpactStats(stats);

    renderWithProviders(<ImpactNumbersSection />);

    expect(screen.getByRole('heading', { name: 'By the Numbers' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByText('1,200+')).toBeInTheDocument();
    expect(screen.getByText('Young people trained')).toBeInTheDocument();
    expect(screen.getByText('Community projects')).toBeInTheDocument();
  });

  it('renders fallback impact stats when no CMS metrics exist', () => {
    mockImpactStats([]);

    renderWithProviders(<ImpactNumbersSection />);

    expect(screen.getByRole('heading', { name: 'By the Numbers' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.getByText('Young people trained')).toBeInTheDocument();
    expect(screen.getByText('African countries reached')).toBeInTheDocument();
  });
});

describe('SdgSection', () => {
  it('renders the complete global-goals framework', () => {
    renderWithProviders(<SdgSection />);

    expect(
      screen.getByRole('heading', { name: 'UN Sustainable Development Goals' }),
    ).toBeInTheDocument();
    expect(screen.getByText('priority goals advanced')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(8);
    expect(screen.getByRole('heading', { name: 'Quality Education' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Climate Action' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Partnerships' })).toBeInTheDocument();
  });
});

describe('ReportsSection', () => {
  it('renders the transparency empty state before reports are published', () => {
    mockReports([]);

    renderWithProviders(<ReportsSection />);

    expect(screen.getByRole('heading', { name: 'Reports & Resources' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reports coming soon' })).toBeInTheDocument();
    expect(screen.getByText('Programme outcomes and reach')).toBeInTheDocument();
  });

  it('renders published reports as downloadable resources', () => {
    mockReports(reports);

    renderWithProviders(<ReportsSection />);

    expect(screen.getByRole('heading', { name: '2026 Impact Report' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download report' })).toHaveAttribute(
      'href',
      'https://example.com/report.pdf',
    );
  });
});
