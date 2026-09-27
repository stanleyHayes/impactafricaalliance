import type { ImpactStoryListItem, Paginated, Permission, PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import ImpactStoriesPage from './ImpactStoriesPage';

const auth: { user: Partial<PublicUser> } = { user: {} };
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const item = (overrides: Partial<ImpactStoryListItem>): ImpactStoryListItem => ({
  id: '64b000000000000000000001',
  title: 'Girls in code',
  slug: 'girls-in-code',
  excerpt: 'How forty girls in Tamale wrote their first programs.',
  cover: null,
  status: 'draft',
  projectId: null,
  project: null,
  tags: [],
  programme: null,
  publishedAt: null,
  blockCount: 2,
  updatedBy: null,
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
  ...overrides,
});

const page = (items: ImpactStoryListItem[]): Paginated<ImpactStoryListItem> => ({
  items,
  page: 1,
  pageSize: 12,
  total: items.length,
  totalPages: 1,
});

const mount = (
  view: 'drafts' | 'published',
  permissions: Permission[],
  role: 'admin' | 'editor',
): void => {
  auth.user = { role, permissions };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ImpactStoriesPage view={view} />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const openActions = async (title: string): Promise<HTMLElement> => {
  fireEvent.click(await screen.findByRole('button', { name: `Actions for ${title}` }));
  return screen.getByRole('menu');
};

describe('ImpactStoriesPage', () => {
  it('asks the API for the tab it shows, one page at a time', async () => {
    vi.mocked(api.get).mockResolvedValue(page([item({})]));
    mount('drafts', ['impact-stories:read'], 'editor');
    expect(await screen.findByText('Girls in code')).toBeInTheDocument();
    // Without update permission the title is not a link to the editor.
    expect(screen.queryByRole('link', { name: 'Girls in code' })).not.toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe(
      '/admin/impact-stories?view=drafts&page=1&pageSize=12',
    );
    // Reading only: no New story button.
    expect(screen.queryByRole('link', { name: 'New story' })).not.toBeInTheDocument();
  });

  it('offers an editor review moves but never publishing or deleting', async () => {
    vi.mocked(api.get).mockResolvedValue(page([item({ status: 'draft' })]));
    mount(
      'drafts',
      ['impact-stories:read', 'impact-stories:create', 'impact-stories:update'],
      'editor',
    );
    const menu = await openActions('Girls in code');
    expect(within(menu).getByRole('menuitem', { name: 'Submit for review' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Publish' })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('lets an administrator unpublish and archive, but not delete, a published story', async () => {
    vi.mocked(api.get).mockResolvedValue(
      page([item({ status: 'published', publishedAt: '2026-09-21T10:00:00.000Z' })]),
    );
    mount(
      'published',
      ['impact-stories:read', 'impact-stories:update', 'impact-stories:delete'],
      'admin',
    );
    const menu = await openActions('Girls in code');
    expect(within(menu).getByRole('menuitem', { name: 'Unpublish' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('view=published');
  });

  it('confirms before archiving, naming the story', async () => {
    vi.mocked(api.get).mockResolvedValue(page([item({ status: 'in-review' })]));
    vi.mocked(api.patch).mockResolvedValue(item({ status: 'archived' }));
    mount('drafts', ['impact-stories:read', 'impact-stories:update'], 'admin');
    const menu = await openActions('Girls in code');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Archive' }));

    const dialog = await screen.findByRole('dialog', { name: 'Archive this story?' });
    expect(within(dialog).getByText('Girls in code')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        '/admin/impact-stories/64b000000000000000000001/status',
        { status: 'archived' },
      ),
    );
  });

  it('clears a search without putting it back while the search box settles', async () => {
    vi.mocked(api.get).mockResolvedValue(page([]));
    auth.user = { role: 'editor', permissions: ['impact-stories:read'] };
    const addresses: string[] = [];
    const Address = (): null => {
      addresses.push(useLocation().search);
      return null;
    };
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ThemeProvider theme={theme}>
          <MemoryRouter>
            <ImpactStoriesPage view="drafts" />
            <Address />
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const search = await screen.findByRole('textbox', { name: 'Search stories' });
    fireEvent.change(search, { target: { value: 'girls' } });
    await waitFor(() => expect(addresses.at(-1)).toBe('?q=girls'));

    const clear = await screen.findByRole('button', { name: 'Clear filters' });
    const before = addresses.length;
    fireEvent.click(clear);
    // Longer than the search box's debounce.
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(addresses.slice(before).filter((address) => address.includes('q='))).toEqual([]);
    expect(search).toHaveValue('');
  });

  it('says what fills an empty tab', async () => {
    vi.mocked(api.get).mockResolvedValue(page([]));
    mount('published', ['impact-stories:read'], 'editor');
    expect(await screen.findByText('Nothing published yet')).toBeInTheDocument();
    expect(
      screen.getByText('Stories appear here once an administrator publishes them on the website.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Include archived stories' })).toBeInTheDocument();
  });
});
