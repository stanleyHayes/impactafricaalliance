import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';

import { RecordActions } from './RecordActions';

const auth = vi.hoisted(() => ({ permissions: ['subscribers:read'] }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: auth }) }));
vi.mock('../../lib/api-client', () => ({ api: { patch: vi.fn(), delete: vi.fn() } }));
const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RecordActions
        resource="subscribers"
        endpoint="/admin/submissions/subscribers"
        record={{
          id: 'one',
          name: 'Test subscriber',
          source: 'Website',
          consent: false,
          createdAt: '2026-09-09T14:30:00.000Z',
          details: { hours: 0, nested: ['First answer', 'Second answer'] },
        }}
        editableFields={['name', 'source']}
        deletable
      />
    </QueryClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  auth.permissions = ['subscribers:read'];
});
describe('record actions', () => {
  it('shows all nested values and gates update/delete independently', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View' }).textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByText('9 September 2026 at 14:30 UTC')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Second answer')).toBeInTheDocument();
  });
  it('does not give delete permission to an editor and preserves a failed edit', async () => {
    auth.permissions.push('subscribers:update');
    vi.mocked(api.patch).mockRejectedValue(new Error('Try again'));
    mount();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Corrected' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again');
    expect(screen.getByLabelText('Name')).toHaveValue('Corrected');
  });
  it('requires confirmation before deletion', async () => {
    auth.permissions.push('subscribers:delete');
    vi.mocked(api.delete).mockResolvedValue(undefined);
    mount();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/admin/submissions/subscribers/one'),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
