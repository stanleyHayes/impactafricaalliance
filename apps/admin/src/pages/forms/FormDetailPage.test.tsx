import { ROLE_TEMPLATES, type FormDefinition, type Permission, type PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import FormDetailPage from './FormDetailPage';

vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const clients: QueryClient[] = [];

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
});

const signedIn = (role: 'admin' | 'editor', permissions: Permission[]): void => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'me', role, permissions } as unknown as PublicUser,
  } as ReturnType<typeof useAuth>);
};

const form = (overrides: Partial<FormDefinition> = {}): FormDefinition => ({
  id: 'form-1',
  title: 'Speaker call',
  slug: 'speaker-call',
  type: 'speaker-application',
  status: 'draft',
  settings: { allowDrafts: true, notifyEmails: [], acknowledgeApplicant: true },
  steps: [
    {
      id: 'about',
      title: 'About you',
      fields: [{ id: 'name', type: 'short-text', label: 'Name', required: true, options: [] }],
    },
  ],
  version: 1,
  submissionCount: 0,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
  ...overrides,
});

const serve = (current: FormDefinition): void => {
  vi.mocked(api.get).mockImplementation(
    (path: string) =>
      Promise.resolve(
        path.startsWith('/admin/applications')
          ? { items: [], page: 1, pageSize: 5, total: 0, totalPages: 1 }
          : current,
      ) as never,
  );
};

const setup = (): void => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/forms/form-1']}>
          <Routes>
            <Route path="/forms/:formId" element={<FormDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const EDITOR: Permission[] = ['forms:read', 'forms:create', 'forms:update'];

describe('FormDetailPage', () => {
  it('shows an editor why they cannot publish, and no publish button', async () => {
    signedIn('editor', EDITOR);
    serve(form());
    setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Speaker call' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Only an administrator can publish/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    // Without applications:read the recent applications are not there at all.
    expect(screen.queryByText('Recent applications')).not.toBeInTheDocument();
    expect(screen.queryByText(/An administrator can give you access/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Edit/ })).toHaveAttribute(
      'href',
      '/forms/form-1/edit',
    );
  });

  it('lets an administrator publish after confirming that the page becomes public', async () => {
    signedIn('admin', ROLE_TEMPLATES.admin);
    serve(form());
    vi.mocked(api.patch).mockResolvedValue(form({ status: 'published' }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/will be public at/)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/admin/forms/form-1/status', { status: 'published' }),
    );
  });

  it('lists what blocks publishing and keeps the button disabled until it is fixed', async () => {
    signedIn('admin', ROLE_TEMPLATES.admin);
    serve(form({ steps: [{ id: 'about', title: 'About you', fields: [] }] }));
    setup();
    expect(await screen.findByText('Fix these before publishing')).toBeInTheDocument();
    expect(screen.getByText('Add at least one question.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('offers closing a live form, and refuses deletion once people have applied', async () => {
    signedIn('admin', ROLE_TEMPLATES.admin);
    serve(form({ status: 'published', submissionCount: 3 }));
    setup();
    expect(await screen.findByRole('button', { name: 'Close to new applications' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Return to draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot be deleted/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
  });

  it('opens the preview in a new tab from a fresh preview link', async () => {
    signedIn('editor', EDITOR);
    serve(form());
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    vi.mocked(api.post).mockResolvedValue({
      url: 'https://site.example/apply/preview#token',
      expiresAt: '2026-09-02T12:00:00.000Z',
    });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Preview' }));
    await waitFor(() =>
      expect(tab.location.replace).toHaveBeenCalledWith('https://site.example/apply/preview#token'),
    );
    expect(api.post).toHaveBeenCalledWith('/admin/forms/form-1/preview', {});
    expect(tab.opener).toBeNull();
    open.mockRestore();
  });
});
