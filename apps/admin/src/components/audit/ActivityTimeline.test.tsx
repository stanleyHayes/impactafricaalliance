import type { AuditEvent, Paginated } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { projectChangeLabel, taskChangeLabel } from '../../lib/select-options';
import { theme } from '../../theme/theme';

import { ActivityTimeline, relativeTime } from './ActivityTimeline';

vi.mock('../../lib/api-client', () => ({ api: { get: vi.fn() } }));

const event = (overrides: Partial<AuditEvent> = {}): AuditEvent => ({
  id: 'e1',
  module: 'projects',
  entityType: 'project',
  entityId: 'p1',
  action: 'status-changed',
  actor: { id: 'u1', name: 'Ama Mensah', email: 'ama@example.org', role: 'editor' },
  summary: 'Moved the project to Active',
  changes: [{ field: 'status', from: 'planned', to: 'active' }],
  at: '2026-09-20T10:00:00.000Z',
  ...overrides,
});

const page = (items: AuditEvent[], current = 1, totalPages = 1): Paginated<AuditEvent> => ({
  items,
  page: current,
  pageSize: 20,
  total: items.length,
  totalPages,
});

const clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
});

const Address = (): JSX.Element => <output>{useLocation().search}</output>;

const setup = (
  path = '/projects/p1/activity',
  formatValue?: ComponentProps<typeof ActivityTimeline>['formatValue'],
): void => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/projects/:projectId/activity"
              element={
                <>
                  <ActivityTimeline
                    endpoint="/admin/projects/p1/activity"
                    queryKey={['projects', 'p1', 'activity']}
                    formatValue={formatValue}
                  />
                  <Address />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('ActivityTimeline', () => {
  it('shows who did what, with the fields that changed', async () => {
    vi.mocked(api.get).mockResolvedValue(page([event()]));
    setup();
    expect(await screen.findByText('Moved the project to Active')).toBeInTheDocument();
    expect(screen.getByText('Ama Mensah')).toBeInTheDocument();
    expect(screen.getByText('Status changed')).toBeInTheDocument();
    expect(screen.getByText(/planned → active/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/admin/projects/p1/activity?page=1&pageSize=20');
  });

  it('gives the time on the 12-hour clock the rest of the console uses', async () => {
    vi.mocked(api.get).mockResolvedValue(page([event()]));
    setup();
    await screen.findByText('Moved the project to Active');
    const time = document.querySelector('time');
    expect(time).toHaveAttribute('dateTime', '2026-09-20T10:00:00.000Z');
    // Whatever the machine's zone, the clock reads "h:mm am|pm", never "10:00".
    expect(time?.getAttribute('title')).toMatch(/, \d{1,2}:\d{2}\s?(am|pm)$/i);
  });

  it('shows changed values in the words the screens use when given a formatter', async () => {
    vi.mocked(api.get).mockResolvedValue(
      page([
        event({
          summary: 'Moved the project from Planned to Active',
          changes: [
            { field: 'status', from: 'planned', to: 'active' },
            { field: 'priority', from: 'low', to: '' },
            { field: 'title', from: 'planned', to: 'Clinic' },
          ],
        }),
      ]),
    );
    setup('/projects/p1/activity', projectChangeLabel);
    await screen.findByText('Moved the project from Planned to Active');
    const changes = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(changes).toContain('Status: Planned → Active');
    expect(changes).toContain('Priority: Low → empty');
    // Only the fields the formatter knows are relabelled.
    expect(changes).toContain('Title: planned → Clinic');
    expect(screen.queryByText(/planned → active/)).not.toBeInTheDocument();
  });

  it('names a removed colleague by the email recorded at the time', async () => {
    vi.mocked(api.get).mockResolvedValue(
      page([event({ actor: null, actorEmail: 'former@example.org' })]),
    );
    setup();
    expect(await screen.findByText('former@example.org')).toBeInTheDocument();
  });

  it('says when nothing has been recorded', async () => {
    vi.mocked(api.get).mockResolvedValue(page([]));
    setup();
    expect(await screen.findByText('No activity recorded yet')).toBeInTheDocument();
  });

  it('offers a retry when the log cannot be loaded', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('offline'));
    vi.mocked(api.get).mockResolvedValueOnce(page([event()]));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Moved the project to Active')).toBeInTheDocument();
  });

  it('pages through the address, leaving the list page parameter alone', async () => {
    vi.mocked(api.get).mockImplementation(((path: string) =>
      Promise.resolve(
        path.includes('page=2')
          ? page([event({ id: 'e2', summary: 'Created the project' })], 2, 2)
          : page([event()], 1, 2),
      )) as never);
    setup('/projects/p1/activity?page=3');
    await screen.findByText('Moved the project to Active');
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(await screen.findByText('Created the project')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('activityPage=2'));
    expect(screen.getByRole('status')).toHaveTextContent('page=3');
    expect(screen.getByRole('list', { name: 'Activity' })).toHaveFocus();
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-09-27T12:00:00.000Z');

  it('reads task statuses as the board names them', () => {
    expect(taskChangeLabel('status', 'in-progress')).toBe('In progress');
    expect(taskChangeLabel('status', 'review')).toBe('In review');
    expect(taskChangeLabel('priority', 'urgent')).not.toBe('');
    expect(taskChangeLabel('title', 'in-progress')).toBe('in-progress');
    expect(projectChangeLabel('status', 'something-new')).toBe('something-new');
  });

  it('counts recent moments in words', () => {
    expect(relativeTime('2026-09-27T11:59:30.000Z', now)).toBe('just now');
    expect(relativeTime('2026-09-27T11:55:00.000Z', now)).toBe('5 minutes ago');
    expect(relativeTime('2026-09-27T09:00:00.000Z', now)).toBe('3 hours ago');
    expect(relativeTime('2026-09-26T09:00:00.000Z', now)).toBe('yesterday');
  });

  it('leaves anything older than a week to the date', () => {
    expect(relativeTime('2026-09-01T12:00:00.000Z', now)).toBeNull();
  });
});
