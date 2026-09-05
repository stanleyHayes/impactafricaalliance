import type { Event } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSaveEvent } from '../lib/admin-hooks';
import { api } from '../lib/api-client';
import { theme } from '../theme/theme';

import EventEditor from './EventEditor';

vi.mock('../lib/admin-hooks', () => ({ useSaveEvent: vi.fn() }));
vi.mock('../lib/api-client', () => ({ api: { get: vi.fn() } }));

const mutate = vi.fn();
const clients: QueryClient[] = [];

beforeEach(() => {
  vi.mocked(useSaveEvent).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useSaveEvent>);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const setup = (url = '/events/new?date=2026-09-18'): void => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route path="/events/new" element={<EventEditor />} />
              <Route path="/events/:eventId/edit" element={<EventEditor />} />
            </Routes>
          </MemoryRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const completeDetails = (): void => {
  fireEvent.change(screen.getByRole('textbox', { name: /Title/ }), {
    target: { value: 'Youth skills workshop' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /Description/ }), {
    target: { value: 'A practical workshop for emerging community leaders.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
};

describe('EventEditor', () => {
  it('uses the selected calendar date and only creates the event after the review step', async () => {
    setup();
    completeDetails();
    expect(await screen.findByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton', { name: 'Day' })[0]).toHaveTextContent('18');
    expect(screen.getAllByRole('spinbutton', { name: 'Hours' })[0]).toHaveTextContent('09');
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /Venue \/ location/ }), {
      target: { value: 'Accra' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'Registration' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'Review' })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Create event' }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      body: {
        title: 'Youth skills workshop',
        location: 'Accra',
        status: 'draft',
        registrationEnabled: false,
      },
    });
  });

  it('opens real MUI calendar and clock controls, accepts time changes, and clears an existing end date', async () => {
    const event: Event = {
      id: 'event-1',
      title: 'Youth skills workshop',
      description: 'A practical workshop for emerging community leaders.',
      startAt: dayjs('2026-09-18T09:00:00').toISOString(),
      endAt: dayjs('2026-09-18T16:00:00').toISOString(),
      registrationClosesAt: dayjs('2026-09-17T18:00:00').toISOString(),
      type: 'other',
      status: 'draft',
      registrationEnabled: true,
      questions: [],
      location: 'Accra',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    vi.mocked(api.get).mockResolvedValue(event);
    setup('/events/event-1/edit');
    await screen.findByRole('textbox', { name: /Title/ });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Choose date/ })[0]!);
    const picker = await screen.findByRole('dialog');
    expect(within(picker).getByRole('grid')).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole('option', { name: '10 hours' }));
    fireEvent.click(within(picker).getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getAllByRole('spinbutton', { name: 'Hours' })[0]).toHaveTextContent('10');

    const startDay = screen.getAllByRole('spinbutton', { name: 'Day' })[0]!;
    fireEvent.click(startDay);
    fireEvent.keyDown(startDay, { key: 'ArrowUp' });
    expect(startDay).toHaveTextContent('19');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('End must be after start.');
    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getAllByRole('spinbutton', { name: 'Day' })[1]).toHaveTextContent('DD');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: 'Registration' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { name: 'Review' });
    fireEvent.click(screen.getByRole('button', { name: 'Update event' }));
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      id: event.id,
      body: {
        startAt: dayjs('2026-09-19T10:00:00').toISOString(),
        endAt: null,
        registrationClosesAt: null,
        registrationEnabled: true,
      },
    });
  });
});
