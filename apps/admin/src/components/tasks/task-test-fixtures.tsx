import type {
  Paginated,
  PersonSummary,
  Task,
  TaskBoard,
  TaskListItem,
  TaskStatus,
} from '@iaa/shared';
import { TASK_BOARD_COLUMNS } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import 'dayjs/locale/en-gb';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { theme } from '../../theme/theme';

/**
 * Shared fixtures for the tasks module's component tests: realistic tasks,
 * pages and boards, and a render with every provider a task view needs.
 * Test-only; nothing in the app imports it.
 */

export const ME = 'a'.repeat(24);

export const person = (id: string, name: string): PersonSummary => ({
  id,
  name,
  email: `${name.split(' ')[0]?.toLowerCase() ?? 'someone'}@iaa.test`,
  role: 'editor',
});

export const esi = person(ME, 'Esi Editor');

let sequence = 0;

export const listItem = (overrides: Partial<TaskListItem> = {}): TaskListItem => {
  sequence += 1;
  const number = overrides.number ?? sequence;
  return {
    id: (overrides.id ?? String(number)).padStart(24, '0'),
    key: `IAA-${number}`,
    number,
    title: `Task number ${number}`,
    status: 'todo',
    priority: 'medium',
    assigneeIds: [],
    assignees: [],
    projectId: null,
    project: null,
    milestoneId: null,
    startDate: null,
    dueDate: null,
    estimateHours: null,
    labels: [],
    parentTaskId: null,
    boardOrder: number * 1024,
    commentCount: 0,
    checklistDone: 0,
    checklistTotal: 0,
    attachmentCount: 0,
    completedAt: null,
    archivedAt: null,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-02T09:00:00.000Z',
    ...overrides,
  };
};

export const fullTask = (overrides: Partial<Task> = {}): Task => {
  // The row's counts ride along unused; a full task carries the lists themselves.
  const base = listItem({ number: 7, title: 'Print the programmes' });
  return {
    ...base,
    description: '',
    reporter: esi,
    milestone: null,
    checklist: [],
    attachments: [],
    parent: null,
    dependencyIds: [],
    dependencies: [],
    subtasks: [],
    updatedBy: esi,
    ...overrides,
  };
};

export const paged = <T,>(items: T[], total = items.length): Paginated<T> => ({
  items,
  page: 1,
  pageSize: 20,
  total,
  totalPages: Math.max(1, Math.ceil(total / 20)),
});

/** A board with the given cards in their columns and totals to match. */
export const boardOf = (
  items: TaskListItem[],
  totals: Partial<Record<TaskStatus, number>> = {},
): TaskBoard => ({
  columns: TASK_BOARD_COLUMNS.map((status) => {
    const cards = items.filter((item) => item.status === status);
    return { status, items: cards, total: totals[status] ?? cards.length };
  }),
});

/** Shows the current address, so a test can check where a click led. */
export const LocationProbe = (): JSX.Element => {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
};

export interface TaskRenderResult extends RenderResult {
  client: QueryClient;
}

/**
 * Renders `ui` at `route`, matched by `path`, inside the providers the task
 * views need: queries (no retries), the theme, the date pickers and a router.
 */
export const renderTaskUi = (
  ui: ReactElement,
  { route = '/', path = '*' }: { route?: string; path?: string } = {},
): TaskRenderResult => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route
                path={path}
                element={
                  <>
                    {ui}
                    <LocationProbe />
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return { ...result, client };
};
