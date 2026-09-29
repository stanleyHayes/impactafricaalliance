import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { api } from '../lib/api-client';
import type { ResourceConfig } from '../resources/types';
import { theme } from '../theme/theme';

import ResourcePage from './ResourcePage';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      role: 'admin',
      permissions: ['team:read', 'team:create', 'team:update', 'team:delete'],
    },
  }),
}));
vi.mock('../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error {
    status = 500;
  },
}));

const resource: ResourceConfig = {
  key: 'team',
  label: 'Team',
  singular: 'Team member',
  columns: [],
  defaultValues: {},
  fields: [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'role', label: 'Role', type: 'text' },
  ],
  createSchema: z.object({ name: z.string(), role: z.string() }),
};
vi.mock('../resources/registry', () => ({
  findResource: (key: string) => (key === 'team' ? resource : undefined),
}));

const member = { id: 'm-1', name: 'Ama Mensah', role: 'Programme Director' };

const renderPage = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/content/team']}>
          <Routes>
            <Route path="/content/:resource" element={<ResourcePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

/** The card's Delete button, focused first as a keyboard or mouse user would leave it. */
const pressDelete = async (): Promise<HTMLElement> => {
  const button = await screen.findByRole('button', { name: 'Delete' });
  button.focus();
  fireEvent.click(button);
  return button;
};

beforeEach(() => {
  // The card view renders every row without the data grid's virtualisation.
  localStorage.setItem('iaa.admin.view.resource-team', 'grid');
  vi.mocked(api.get).mockResolvedValue({
    items: [member],
    total: 1,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe('deleting a record from a CMS page', () => {
  it('asks in the console’s own dialog, naming the record, and deletes nothing yet', async () => {
    renderPage();
    await pressDelete();

    const dialog = await screen.findByRole('dialog', { name: 'Delete this team member?' });
    expect(dialog).toHaveTextContent(
      'Ama Mensah will be deleted from Team. This cannot be undone.',
    );
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deletes nothing when cancelled, and hands focus back to the Delete button', async () => {
    renderPage();
    const trigger = await pressDelete();
    const dialog = await screen.findByRole('dialog', { name: 'Delete this team member?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.delete).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('closes with Escape without deleting', async () => {
    renderPage();
    await pressDelete();
    const dialog = await screen.findByRole('dialog', { name: 'Delete this team member?' });

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deletes only once confirmed, showing that it is working until it has', async () => {
    let finish: () => void = () => undefined;
    vi.mocked(api.delete).mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    renderPage();
    await pressDelete();
    const dialog = await screen.findByRole('dialog', { name: 'Delete this team member?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledTimes(1));
    expect(api.delete).toHaveBeenCalledWith('/admin/team/m-1');
    const pending = await within(dialog).findByRole('button', { name: 'Deleting…' });
    expect(pending).toBeDisabled();
    // Escape cannot close it mid-request, so the outcome always has somewhere to show.
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    vi.mocked(api.get).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    finish();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.delete).toHaveBeenCalledTimes(1);
  });

  it('says why a delete failed inside the dialog, so it can be tried again', async () => {
    vi.mocked(api.delete).mockRejectedValue(new Error('The server could not be reached.'));
    renderPage();
    await pressDelete();
    const dialog = await screen.findByRole('dialog', { name: 'Delete this team member?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The server could not be reached.',
    );
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeEnabled();
  });
});
