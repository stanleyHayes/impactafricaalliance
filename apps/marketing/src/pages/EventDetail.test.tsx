import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api-client';
import { useEvent } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import EventDetail from './EventDetail';

vi.mock('../lib/content-hooks', () => ({ useEvent: vi.fn() }));

const failedEvent = (error: Error, isFetching = false) => {
  const refetch = vi.fn();
  vi.mocked(useEvent).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error,
    isFetching,
    refetch,
  } as unknown as ReturnType<typeof useEvent>);
  return refetch;
};

describe('event recovery', () => {
  it('offers events and support when an event is missing', () => {
    failedEvent(new ApiError(404, 'NOT_FOUND', 'Not found'));
    renderWithProviders(<EventDetail />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'This event isn’t available.',
    );
    expect(screen.getByRole('link', { name: 'Browse events' })).toHaveAttribute('href', '/events');
    expect(screen.getByRole('link', { name: 'Contact the team' })).toHaveAttribute(
      'href',
      '/contact',
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it.each([new TypeError('Failed to fetch'), new ApiError(503, 'UNAVAILABLE', 'Unavailable')])(
    'lets visitors retry a connection or service failure: %s',
    (error) => {
      const retry = failedEvent(error);
      renderWithProviders(<EventDetail />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'We couldn’t load this event.',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(retry).toHaveBeenCalledOnce();
    },
  );

  it('disables retry while the request is running', () => {
    failedEvent(new TypeError('Failed to fetch'), true);
    renderWithProviders(<EventDetail />);
    expect(screen.getByRole('button', { name: 'Trying again…' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Browse events' })).toBeVisible();
  });
});
