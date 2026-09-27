import type { Paginated, PersonSummary, Project, ProjectListItem } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import 'dayjs/locale/en-gb';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { theme } from '../../theme/theme';

/**
 * Fixtures and providers shared by the project page tests. Test-only: nothing
 * in the app imports this file, so it never reaches the bundle.
 */

export const ama: PersonSummary = {
  id: 'a'.repeat(24),
  name: 'Ama Mensah',
  email: 'ama@example.org',
  role: 'editor',
};

export const kofi: PersonSummary = {
  id: 'b'.repeat(24),
  name: 'Kofi Boateng',
  email: 'kofi@example.org',
  role: 'admin',
};

export const page = <T,>(items: T[], total = items.length): Paginated<T> => ({
  items,
  page: 1,
  pageSize: 12,
  total,
  totalPages: Math.max(1, Math.ceil(total / 12)),
});

export const projectFixture = (overrides: Partial<Project> = {}): Project => ({
  id: 'c'.repeat(24),
  title: 'Digital Skills Hub, Tamale',
  slug: 'digital-skills-hub-tamale',
  code: 'DSH-2026',
  summary: 'Coding and e-commerce training for young people in the Northern Region.',
  description: 'The hub runs **three** cohorts a year.',
  status: 'active',
  priority: 'high',
  leadId: ama.id,
  lead: ama,
  memberIds: [ama.id, kofi.id],
  members: [ama, kofi],
  programme: 'digital-skills',
  startDate: '2026-10-05T12:00:00.000Z',
  endDate: '2027-06-30T12:00:00.000Z',
  country: 'Ghana',
  region: 'Northern Region',
  locationText: 'Tamale and surrounding districts',
  objectives: ['Train 300 young people'],
  partners: [{ name: 'Tamale Tech', role: 'Venue host', url: 'https://tamaletech.example' }],
  tags: ['youth'],
  sdgs: [4, 8],
  cover: null,
  milestones: [
    {
      id: 'launch',
      kind: 'milestone',
      title: 'Launch the hub',
      status: 'done',
      dueDate: '2026-10-05T12:00:00.000Z',
      completedAt: '2026-10-05T15:00:00.000Z',
    },
    { id: 'cohort', kind: 'activity', title: 'First cohort', status: 'planned', dueDate: null },
  ],
  metrics: [],
  risks: [],
  progressOverride: null,
  media: [],
  documents: [],
  progress: { value: 42, source: 'tasks-and-milestones', done: 5, total: 12 },
  taskCounts: { total: 10, done: 4, open: 6, overdue: 2 },
  storyCount: 0,
  archivedAt: null,
  archivedFromStatus: null,
  createdBy: ama,
  updatedBy: ama,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-20T10:00:00.000Z',
  ...overrides,
});

export const listItemFixture = (overrides: Partial<ProjectListItem> = {}): ProjectListItem => {
  const project = projectFixture();
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    code: project.code,
    summary: project.summary,
    status: project.status,
    priority: project.priority,
    programme: project.programme,
    lead: project.lead,
    memberIds: project.memberIds,
    startDate: project.startDate,
    endDate: project.endDate,
    country: project.country,
    tags: project.tags,
    cover: null,
    progress: project.progress,
    taskCounts: project.taskCounts,
    archivedAt: null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    ...overrides,
  };
};

const clients: QueryClient[] = [];

/** The query client of the latest `renderAt`, for tests that refresh data behind a page. */
export const latestClient = (): QueryClient => {
  const client = clients.at(-1);
  if (!client) throw new Error('Nothing has been rendered yet');
  return client;
};

/** Clears every query client made by `renderAt`, between tests. */
export const clearClients = (): void => {
  clients.forEach((client) => client.clear());
  clients.length = 0;
};

/** Renders routes at a path with the providers the console gives every page. */
export const renderAt = (path: string, routes: ReactNode): RenderResult => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <MemoryRouter initialEntries={[path]}>{routes}</MemoryRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

/** Answers people-directory requests the way the API does, from a fixed team. */
export const answerPeople = (path: string): Paginated<PersonSummary> | null => {
  if (!path.startsWith('/admin/people')) return null;
  const params = new URL(path, 'http://localhost').searchParams;
  const ids = params.get('ids')?.split(',') ?? null;
  const team = [ama, kofi];
  return page(ids ? team.filter((person) => ids.includes(person.id)) : team);
};
