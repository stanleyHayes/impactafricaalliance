import type { FormListItem, Paginated, Permission, PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import FormsPage from './FormsPage';

vi.mock('../../lib/api-client', () => ({ api: { get: vi.fn() } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const clients: QueryClient[] = [];

const item: FormListItem = {
  id: 'form-1',
  title: 'Speaker call',
  slug: 'speaker-call',
  type: 'speaker-application',
  status: 'published',
  version: 2,
  stepCount: 5,
  fieldCount: 19,
  submissionCount: 7,
  closesAt: '2026-10-31T17:00:00.000Z',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
};

const page = (items: FormListItem[]): Paginated<FormListItem> => ({
  items,
  page: 1,
  pageSize: 12,
  total: items.length,
  totalPages: 1,
});

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'me',
      role: 'editor',
      permissions: ['forms:read', 'forms:create'] as Permission[],
    } as unknown as PublicUser,
  } as ReturnType<typeof useAuth>);
});

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
});

/** The address's query string, so a test can see which filters it holds. */
const Search = (): JSX.Element => <output data-testid="search">{useLocation().search}</output>;

const setup = (url = '/forms'): void => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route
              path="/forms"
              element={
                <>
                  <FormsPage />
                  <Search />
                </>
              }
            />
            <Route path="/forms/new" element={<p>New form page</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('FormsPage', () => {
  it('lists forms with their application counts and filters by tab', async () => {
    vi.mocked(api.get).mockResolvedValue(page([item]));
    setup();
    expect(await screen.findByText('Speaker call')).toBeInTheDocument();
    expect(screen.getByText('7 applications')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Speaker call/ })).toHaveAttribute(
      'href',
      '/forms/form-1',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Archived' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/forms?archived=true&page=1&pageSize=12'),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Draft' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/forms?status=draft&page=1&pageSize=12'),
    );
  });

  it('starts a new form blank or from the speaker template', async () => {
    vi.mocked(api.get).mockResolvedValue(page([]));
    setup();
    expect(await screen.findByText('No forms')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'New form' })[0]!);
    expect(
      screen.getByRole('menuitem', { name: /Speaker application \(template\)/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: /Blank form/ }));
    expect(await screen.findByText('New form page')).toBeInTheDocument();
  });

  it('puts each form under the list heading, which stays one pixel wide', async () => {
    vi.mocked(api.get).mockResolvedValue(
      page([item, { ...item, id: 'form-2', title: 'Mentor call', slug: 'mentor-call' }]),
    );
    setup();
    await screen.findByText('Speaker call');
    // The cards sit one level under the list's own heading.
    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['Speaker call', 'Mentor call']);
    const lists = screen.getAllByRole('heading', { level: 2 });
    expect(lists.map((heading) => heading.textContent)).toEqual(['All forms']);
    // MUI reads a bare `width: 1` as 100%, which stretched the page past the viewport.
    expect(lists[0]).toHaveStyle({ width: '1px', height: '1px', position: 'absolute' });
    expect(lists[0]).toHaveAttribute('tabindex', '-1');
  });

  it('says the page is past the end, rather than that there are no forms', async () => {
    vi.mocked(api.get).mockResolvedValue({ ...page([]), page: 3, total: 13, totalPages: 2 });
    setup('/forms?page=3');
    expect(await screen.findByText('Nothing on this page')).toBeInTheDocument();
    expect(screen.queryByText('No forms')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to the first page' }));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
  });

  it('draws its filters at the small size the other list toolbars use', async () => {
    vi.mocked(api.get).mockResolvedValue(page([item]));
    setup();
    await screen.findByText('Speaker call');
    expect(
      screen.getByRole('textbox', { name: 'Search forms' }).closest('.MuiInputBase-root'),
    ).toHaveClass('MuiInputBase-sizeSmall');
    expect(
      screen.getByRole('combobox', { name: 'Type' }).closest('.MuiInputBase-root'),
    ).toHaveClass('MuiInputBase-sizeSmall');
  });

  it('offers to clear the filters when nothing matches, keeping the status tab', async () => {
    vi.mocked(api.get).mockResolvedValue(page([]));
    setup('/forms?status=published&type=general&page=2');
    const search = screen.getByRole('textbox', { name: 'Search forms' });
    fireEvent.change(search, { target: { value: 'nothing like this' } });
    expect(await screen.findByText('No forms match')).toBeInTheDocument();
    // One in the empty state, one beside the filters.
    const clear = screen.getAllByRole('button', { name: 'Clear filters' });
    expect(clear).toHaveLength(2);

    fireEvent.click(clear[0]!);

    expect(search).toHaveValue('');
    expect(screen.getByTestId('search')).toHaveTextContent(/^\?status=published$/);
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/forms?status=published&page=1&pageSize=12'),
    );
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });
});
