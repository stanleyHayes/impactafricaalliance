import type { Event } from '@iaa/shared';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api-client';
import { useEvent } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import EventDetail from './EventDetail';

vi.mock('../lib/content-hooks', () => ({ useEvent: vi.fn() }));
// The page's own layout is under test here, not the sections it hosts.
vi.mock('../components/events/EventArtwork', () => ({
  EventArtwork: ({ src }: { src?: string }) => <img alt="" src={src} />,
}));
vi.mock('../components/EventSchema', () => ({ EventSchema: () => null }));
vi.mock('../features/events/EventActions', () => ({ EventActions: () => null }));
vi.mock('../features/events/EventRegistrationDialog', () => ({
  EventRegistrationDialog: () => null,
}));
vi.mock('../features/reviews/EventReviewSection', () => ({ EventReviewSection: () => null }));

const loadedEvent = (overrides: Partial<Event> = {}): void => {
  const event = {
    id: '64b7f0c2a1b2c3d4e5f60718',
    title: 'Capacity Building Masterclass',
    type: 'community-event',
    description: 'A day of practical AI skills.',
    startAt: '2026-10-10T09:00:00.000Z',
    location: 'Google AI Community Centre, Accra',
    status: 'published',
    questions: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Event;
  vi.mocked(useEvent).mockReturnValue({
    data: event,
    isLoading: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useEvent>);
};

describe('event artwork', () => {
  it('leaves an event’s own flyer uncovered', () => {
    loadedEvent({
      image: {
        url: 'https://res.cloudinary.com/demo/image/upload/flyer.jpg',
        publicId: 'iaa/flyer',
        width: 1080,
        height: 1350,
      },
    });
    renderWithProviders(<EventDetail />);
    expect(screen.getByTestId('event-artwork-frame')).toBeInTheDocument();
    expect(screen.queryByText('Meet. Learn. Build.')).not.toBeInTheDocument();
  });

  it('dresses the stand-in artwork with the strapline when there is no flyer', () => {
    loadedEvent();
    renderWithProviders(<EventDetail />);
    expect(screen.getByText('Meet. Learn. Build.')).toBeInTheDocument();
    expect(screen.getByText('Impact Africa Alliance')).toBeInTheDocument();
  });
});

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
