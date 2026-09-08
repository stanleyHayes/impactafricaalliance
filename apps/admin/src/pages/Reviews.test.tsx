import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useModerateReview, useReviews } from '../lib/admin-hooks';
import { theme } from '../theme/theme';

import Reviews, { ReviewQueue } from './Reviews';

vi.mock('../lib/admin-hooks', () => ({
  useReviews: vi.fn(),
  useModerateReview: vi.fn(),
}));

const renderLoading = (): void => {
  vi.mocked(useReviews).mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
  } as ReturnType<typeof useReviews>);
  vi.mocked(useModerateReview).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useModerateReview>);

  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Reviews />
      </MemoryRouter>
    </ThemeProvider>,
  );
};

describe('the reviews page while it is loading', () => {
  it('shows the real heading rather than a placeholder for it', () => {
    renderLoading();

    // The title, description and filters owe nothing to the request, so
    // drawing a grey bar and swapping it for the title a moment later is a
    // change the reader sees, and a change for nothing.
    expect(screen.getByRole('heading', { name: 'Reviews' })).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing appears on the site until it is published/),
    ).toBeInTheDocument();
  });

  it('leaves the status filters usable while the list loads', () => {
    renderLoading();

    // Choosing "Published" before the first page arrives should not require
    // waiting for a list the reader does not want.
    expect(screen.getByRole('button', { name: 'Waiting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
  });
});

describe('event review moderation', () => {
  it('keeps pagination scoped to the event and allows removing a published review', () => {
    vi.mocked(useReviews).mockReturnValue({
      data: {
        items: [
          {
            id: 'review-1',
            eventId: 'event-1',
            eventTitle: 'Workshop',
            subject: 'event',
            status: 'published',
            rating: 4,
            displayName: 'Attendee',
            email: 'attendee@example.com',
            createdAt: '2026-09-08T12:00:00Z',
            comment: 'A useful workshop.',
          },
        ],
        total: 21,
        totalPages: 2,
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useReviews>);
    const mutate = vi.fn();
    vi.mocked(useModerateReview).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useModerateReview>);
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ReviewQueue eventId="event-1" />
        </MemoryRouter>
      </ThemeProvider>,
    );
    expect(useReviews).toHaveBeenLastCalledWith({ eventId: 'event-1', status: 'pending', page: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(useReviews).toHaveBeenLastCalledWith({ eventId: 'event-1', status: 'pending', page: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Published' }));
    expect(useReviews).toHaveBeenLastCalledWith({
      eventId: 'event-1',
      status: 'published',
      page: 1,
    });
    expect(screen.getByText('A useful workshop.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText('Why (optional)'), {
      target: { value: 'Contains identifying information' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' }).at(-1)!);
    expect(mutate).toHaveBeenCalledWith(
      { id: 'review-1', status: 'rejected', rejectionReason: 'Contains identifying information' },
      expect.any(Object),
    );
  });
});
