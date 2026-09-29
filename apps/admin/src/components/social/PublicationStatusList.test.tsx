import type { SocialPublication } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { PublicationStatusList } from './PublicationStatusList';

const role = vi.hoisted(() => ({ current: 'admin' }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: role.current } }) }));

const publications = vi.hoisted(() => ({ current: [] as SocialPublication[] }));
const reject = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  error: null as Error | null,
}));
vi.mock('../../lib/social-publishing', () => ({
  useSocialPublications: () => ({ data: publications.current, isLoading: false }),
  useApprovePublication: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectPublication: () => reject,
  useRetryPublication: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelPublication: () => ({ mutate: vi.fn(), isPending: false }),
}));

const held = (overrides: Partial<SocialPublication> = {}): SocialPublication =>
  ({
    id: 'pub-1',
    connectionId: 'conn-1',
    destination: 'linkedin',
    status: 'pending_approval',
    caption: 'A post awaiting review',
    retryCount: 0,
    idempotencyKey: 'k',
    createdAt: '2026-09-07T10:00:00.000Z',
    updatedAt: '2026-09-07T10:00:00.000Z',
    ...overrides,
  }) as SocialPublication;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  Object.assign(reject, { isPending: false, isError: false, error: null });
});

const renderList = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={new QueryClient()}>
        <PublicationStatusList />
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe('a publication waiting for approval', () => {
  it('offers an administrator Approve and Decline', () => {
    role.current = 'admin';
    publications.current = [held()];
    renderList();

    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  });

  it('offers an editor neither, and says what it is waiting on', () => {
    role.current = 'editor';
    publications.current = [held()];
    renderList();

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    expect(screen.getByText('Waiting for an administrator')).toBeInTheDocument();
  });

  it('does not offer Retry, which would route around the approval', () => {
    role.current = 'editor';
    publications.current = [held()];
    renderList();

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

describe('a declined publication', () => {
  it('shows why, so the writer knows what to change', () => {
    role.current = 'editor';
    publications.current = [
      held({
        status: 'cancelled',
        rejectionReason: 'The headline overstates the numbers.',
        rejectedAt: '2026-09-07T11:00:00.000Z',
      }),
    ];
    renderList();

    expect(screen.getByText(/overstates the numbers/)).toBeInTheDocument();
  });
});

describe('a published destination', () => {
  it('is never offered Retry, which is how duplicates happen', () => {
    role.current = 'admin';
    publications.current = [held({ status: 'published', publishedAt: '2026-09-07T11:00:00.000Z' })];
    renderList();

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

describe('declining a publication', () => {
  const openDecline = async (): Promise<HTMLElement> => {
    role.current = 'admin';
    publications.current = [held()];
    renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    return screen.findByRole('dialog', { name: 'Decline this post' });
  };

  it('asks for the reason in the console’s own dialog, not the browser’s prompt', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    const dialog = await openDecline();

    expect(prompt).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent('The LinkedIn post will not be published.');
    expect(within(dialog).getByRole('textbox', { name: /Reason for declining/ })).toHaveFocus();
  });

  it('requires a reason, and says so under the field', async () => {
    const dialog = await openDecline();
    const field = within(dialog).getByRole('textbox', { name: /Reason for declining/ });
    const decline = within(dialog).getByRole('button', { name: 'Decline' });

    decline.focus();
    fireEvent.click(decline);

    expect(reject.mutate).not.toHaveBeenCalled();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(/Say why this post is being declined/);
    expect(field).toHaveFocus();
  });

  it('refuses a throwaway reason', async () => {
    const dialog = await openDecline();
    const field = within(dialog).getByRole('textbox', { name: /Reason for declining/ });

    fireEvent.change(field, { target: { value: 'No.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }));

    expect(reject.mutate).not.toHaveBeenCalled();
    expect(field).toHaveAccessibleDescription(/at least 10 characters/);
  });

  it('counts what is typed against the limit', async () => {
    const dialog = await openDecline();
    const field = within(dialog).getByRole('textbox', { name: /Reason for declining/ });

    expect(field).toHaveAttribute('maxlength', '500');
    fireEvent.change(field, { target: { value: 'Too soon' } });
    expect(within(dialog).getByText('8/500')).toBeInTheDocument();
  });

  it('declines with the reason once it will do', async () => {
    const dialog = await openDecline();

    fireEvent.change(within(dialog).getByRole('textbox', { name: /Reason for declining/ }), {
      target: { value: '  The headline overstates the numbers.  ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Decline' }));

    expect(reject.mutate).toHaveBeenCalledWith(
      { id: 'pub-1', reason: 'The headline overstates the numbers.' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('closes on Cancel without declining', async () => {
    const dialog = await openDecline();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(reject.mutate).not.toHaveBeenCalled();
  });

  it('cannot be sent twice or closed while the decline is on its way', async () => {
    reject.isPending = true;
    const dialog = await openDecline();

    expect(within(dialog).getByRole('button', { name: 'Declining…' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('says why a decline failed, inside the dialog', async () => {
    Object.assign(reject, { isError: true, error: new Error('The server could not be reached.') });
    const dialog = await openDecline();

    expect(within(dialog).getByRole('alert')).toHaveTextContent('The server could not be reached.');
  });
});
