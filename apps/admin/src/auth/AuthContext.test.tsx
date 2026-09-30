import type { PublicUser } from '@iaa/shared';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, onSessionRefreshed } from '../lib/api-client';

import { AuthProvider, useAuth } from './AuthContext';

let refreshed: (() => void) | undefined;

vi.mock('../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  onSessionRefreshed: vi.fn((listener: () => void) => {
    refreshed = listener;
    return () => {
      refreshed = undefined;
    };
  }),
  setSessionExpiredHandler: vi.fn(),
  startKeepAlive: vi.fn(() => () => undefined),
}));

vi.mock('../lib/token-store', () => ({
  tokenStore: { access: 'access-token', refresh: 'refresh-token', set: vi.fn(), clear: vi.fn() },
}));

const account = (permissions: string[], id = 'u1'): PublicUser =>
  ({
    id,
    name: 'Ama Mensah',
    email: 'ama@example.org',
    role: 'editor',
    isActive: true,
    permissions,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }) as PublicUser;

const Permissions = (): JSX.Element => {
  const { user } = useAuth();
  return <p data-testid="permissions">{user?.permissions.join(',') ?? 'none'}</p>;
};

const renderAuth = (): void => {
  render(
    <AuthProvider>
      <Permissions />
    </AuthProvider>,
  );
};

describe('keeping the account current without a reload', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows a newly granted module after the session is refreshed', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(account(['projects:read']))
      .mockResolvedValueOnce(account(['projects:read', 'tasks:read']));
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('permissions')).toHaveTextContent('projects:read'),
    );
    expect(onSessionRefreshed).toHaveBeenCalled();

    act(() => refreshed?.());

    await waitFor(() =>
      expect(screen.getByTestId('permissions')).toHaveTextContent('projects:read,tasks:read'),
    );
  });

  it('drops a module whose permission was removed', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(account(['projects:read', 'tasks:read']))
      .mockResolvedValueOnce(account(['projects:read']));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('permissions')).toHaveTextContent('tasks:read'));

    act(() => refreshed?.());

    await waitFor(() =>
      expect(screen.getByTestId('permissions')).not.toHaveTextContent('tasks:read'),
    );
  });

  it('looks again on return to the window, but at most once a minute', async () => {
    vi.mocked(api.get).mockResolvedValue(account(['projects:read']));
    renderAuth();
    // Signed in, so the window is being watched.
    await waitFor(() =>
      expect(screen.getByTestId('permissions')).toHaveTextContent('projects:read'),
    );
    expect(api.get).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(61_000);
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('ignores a background read that belongs to another account', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(account(['projects:read']))
      .mockResolvedValueOnce(account(['users:read'], 'someone-else'));
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('permissions')).toHaveTextContent('projects:read'),
    );

    act(() => refreshed?.());

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('permissions')).toHaveTextContent('projects:read');
    expect(screen.getByTestId('permissions')).not.toHaveTextContent('users:read');
  });
});
