import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganisationReviews } from '../../lib/content-hooks';
import { renderWithProviders } from '../../test/test-utils';

import { previewReviews } from './review-preview';
import { ReviewsFeed } from './ReviewsFeed';

vi.mock('../../lib/content-hooks', () => ({ useOrganisationReviews: vi.fn() }));

describe('reviews pagination', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(useOrganisationReviews).mockImplementation(
      (page = 1) =>
        ({
          data: { items: [previewReviews[page - 1]], total: 12, totalPages: 2, page, pageSize: 10 },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        }) as unknown as ReturnType<typeof useOrganisationReviews>,
    );
  });
  it('requests the selected page and replaces the cards', () => {
    renderWithProviders(<ReviewsFeed />);
    expect(screen.getByText('Ama K. (sample)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(useOrganisationReviews).toHaveBeenLastCalledWith(2);
    expect(screen.getByText('Daniel O. (sample)')).toBeInTheDocument();
    expect(screen.queryByText('Ama K. (sample)')).not.toBeInTheDocument();
  });
  it('shows a retry state rather than an empty state on failure', () => {
    vi.mocked(useOrganisationReviews).mockReturnValue({
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useOrganisationReviews>);
    renderWithProviders(<ReviewsFeed />);
    expect(screen.getByRole('alert')).toHaveTextContent('Reviews could not be loaded');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
