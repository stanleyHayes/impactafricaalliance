import type { PublicUser } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../lib/api-client';
import { theme } from '../theme/theme';

import UserAccessEditor from './UserAccessEditor';

const { updateAuthUser } = vi.hoisted(() => ({ updateAuthUser: vi.fn() }));

vi.mock('../lib/api-client', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'current-admin', role: 'admin' }, updateUser: updateAuthUser }),
}));

const clients: QueryClient[] = [];

const setup = (path = '/users/invite'): void => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/users/invite" element={<UserAccessEditor />} />
            <Route path="/users/:userId/permissions" element={<UserAccessEditor />} />
            <Route path="/users" element={<div>Users destination</div>} />
            <Route path="/" element={<div>Dashboard destination</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(api.post).mockResolvedValue({
    email: 'teammate@example.org',
    role: 'editor',
    message: 'Invitation sent',
  });
});

afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.resetAllMocks();
});

describe('UserAccessEditor', { timeout: 30_000 }, () => {
  it('validates identity and sends a standard invitation only after review', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('textbox', { name: /Email/ })).toHaveAttribute('aria-invalid', 'true');
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: /Email/ }), {
      target: { value: 'teammate@example.org' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('checkbox', { name: 'Customize permissions' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sending will email an invitation to teammate@example.org',
    );
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/admin/invitations', {
        email: 'teammate@example.org',
        role: 'editor',
      }),
    );
    expect(await screen.findByText('Invitation sent')).toBeInTheDocument();
  });

  it('keeps selected custom permissions when moving backwards through the steps', async () => {
    setup();
    fireEvent.change(screen.getByRole('textbox', { name: /Email/ }), {
      target: { value: 'teammate@example.org' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Customize permissions' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Read Events' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('checkbox', { name: 'Read Events' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Create Events' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/admin/invitations', {
        email: 'teammate@example.org',
        role: 'editor',
        permissions: ['events:read'],
      }),
    );
  });

  it('loads a direct edit URL, preserves custom access on role changes, and refreshes self access', async () => {
    const user = {
      id: 'current-admin',
      name: 'Current Admin',
      email: 'admin@example.org',
      role: 'admin',
      permissions: ['events:read'],
      isActive: true,
    } as PublicUser;
    const savedUser = {
      ...user,
      role: 'editor',
      permissions: ['events:read', 'events:create'],
    } as PublicUser;
    vi.mocked(api.get).mockResolvedValue([user]);
    vi.mocked(api.patch).mockResolvedValue(savedUser);
    setup('/users/current-admin/permissions');

    const role = await screen.findByRole('combobox', { name: 'Role' });
    fireEvent.mouseDown(role);
    // The option is named by its label and the line of description beneath it.
    fireEvent.click(screen.getByRole('option', { name: /^Editor\b/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('checkbox', { name: 'Read Events' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Read Articles' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Create Events' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save permissions' }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/admin/users/current-admin/permissions', {
        role: 'editor',
        permissions: ['events:read', 'events:create'],
      }),
    );
    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument();
    expect(updateAuthUser).toHaveBeenCalledWith(savedUser);
  });
});
