import type { Event } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { api } from '../lib/api-client';
import { theme } from '../theme/theme';

import EventDetail from './EventDetail';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'admin', permissions: ['events:read', 'events:update', 'reviews:read'] },
  }),
}));
vi.mock('../lib/api-client', () => ({ api: { get: vi.fn() } }));
vi.mock('./Reviews', () => ({
  ReviewQueue: ({ eventId }: { eventId: string }) => <div>Queue for {eventId}</div>,
}));
vi.mock('../components/events/EventQrDialog', () => ({ EventQrDialog: () => null }));

const mount = () =>
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/events/event-1']}>
          <Routes>
            <Route path="/events/:eventId" element={<EventDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );

describe('dedicated event details', () => {
  it('loads directly by route and displays questions with event-scoped moderation', async () => {
    const event = {
      id: 'event-1',
      title: 'Career workshop',
      description: 'Full event description',
      startAt: '2026-09-11T17:00:00Z',
      location: 'Accra',
      type: 'webinar',
      status: 'published',
      registrationEnabled: true,
      capacity: 40,
      questions: [
        {
          id: 'q1',
          label: 'What would you like to learn?',
          type: 'single-choice',
          options: ['Design', 'Development'],
          required: true,
        },
      ],
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-08T12:00:00Z',
    } as Event;
    vi.mocked(api.get).mockImplementation(async (path) =>
      path.includes('/summary') ? { count: 0, distribution: [0, 0, 0, 0, 0] } : event,
    );
    mount();
    expect(await screen.findByRole('heading', { name: 'Career workshop' })).toBeInTheDocument();
    expect(screen.getByText('40 places')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Queue for event-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit event' })).toHaveAttribute(
      'href',
      '/events/event-1/edit',
    );
    expect(api.get).toHaveBeenCalledWith('/admin/reviews/events/event-1/summary');
  });

  it('offers recovery when a direct event link fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Event not found'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Event not found');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to events' })).toHaveAttribute('href', '/events');
  });
});
