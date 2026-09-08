import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useModerateReview, useReviews } from '../lib/admin-hooks';
import { theme } from '../theme/theme';

import Reviews from './Reviews';

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
    expect(screen.getByText(/Nothing appears on the site until it is published/)).toBeInTheDocument();
  });

  it('leaves the status filters usable while the list loads', () => {
    renderLoading();

    // Choosing "Published" before the first page arrives should not require
    // waiting for a list the reader does not want.
    expect(screen.getByRole('button', { name: 'Waiting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
  });
});
