import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useNewSubmissionCounts } from '../lib/admin-hooks';

import { NewSubmissionsBanner } from './NewSubmissionsBanner';

vi.mock('../lib/admin-hooks', () => ({ useNewSubmissionCounts: vi.fn() }));

const mockCounts = (data: unknown): void => {
  vi.mocked(useNewSubmissionCounts).mockReturnValue({ data } as ReturnType<
    typeof useNewSubmissionCounts
  >);
};

const renderBanner = (): ReturnType<typeof render> =>
  render(
    <MemoryRouter>
      <NewSubmissionsBanner />
    </MemoryRouter>,
  );

describe('NewSubmissionsBanner', () => {
  it('stays out of the way when the inbox is clear', () => {
    mockCounts({ total: 0, byType: {}, items: [] });
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing before the count has loaded', () => {
    mockCounts(undefined);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('says how many are waiting and links to the inbox', () => {
    mockCounts({ total: 3, byType: { partner: 2, volunteer: 1 }, items: [] });
    renderBanner();

    expect(screen.getByText('3 new submissions waiting')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review/i })).toHaveAttribute('href', '/submissions');
  });

  it('breaks the total down by type, each linking to its own inbox', () => {
    mockCounts({ total: 3, byType: { partner: 2, volunteer: 1 }, items: [] });
    renderBanner();

    expect(screen.getByRole('link', { name: /2 partners/i })).toHaveAttribute(
      'href',
      '/submissions/partners',
    );
    expect(screen.getByRole('link', { name: /1 mentor/i })).toHaveAttribute(
      'href',
      '/submissions/mentors',
    );
  });

  it('omits types with nothing waiting', () => {
    mockCounts({ total: 1, byType: { partner: 1 }, items: [] });
    renderBanner();

    expect(screen.queryByText(/mentor/i)).not.toBeInTheDocument();
  });

  it('uses the singular for a single submission', () => {
    mockCounts({ total: 1, byType: { contact: 1 }, items: [] });
    renderBanner();

    expect(screen.getByText('1 new submission waiting')).toBeInTheDocument();
  });
});
