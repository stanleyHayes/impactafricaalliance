import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../lib/api-client';

import SubmissionDetail from './SubmissionDetail';

const auth = vi.hoisted(() => ({
  permissions: ['submissions:read', 'submissions:update', 'submissions:delete'],
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth }) }));
vi.mock('../lib/api-client', () => ({ api: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
const item = {
  id: 'record-1',
  type: 'volunteer',
  status: 'new',
  consent: true,
  consentVersion: 'original',
  payload: {
    name: 'Joseph Boffah',
    email: 'joseph@example.org',
    country: 'Ghana',
    expertise: 'Training and Coaching',
    availabilityHoursPerMonth: 5,
    message: 'Full volunteer message without truncation.',
  },
};
const mount = (edit = false) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter initialEntries={[`/submissions/records/record-1${edit ? '/edit' : ''}`]}>
        <Routes>
          <Route path="/submissions/records/:id" element={<SubmissionDetail />} />
          <Route path="/submissions/records/:id/edit" element={<SubmissionDetail edit />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
beforeEach(() => {
  vi.clearAllMocks();
  auth.permissions = ['submissions:read', 'submissions:update', 'submissions:delete'];
  vi.mocked(api.get).mockResolvedValue(item);
});
describe('submission details and editor', () => {
  it('shows all payload and consent fields to a reader without edit/delete actions', async () => {
    auth.permissions = ['submissions:read'];
    mount();
    expect(await screen.findByText(item.payload.message)).toBeInTheDocument();
    expect(screen.getByText('original')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
  it('blocks a direct edit URL before fetching for a reader', () => {
    auth.permissions = ['submissions:read'];
    mount(true);
    expect(screen.getByRole('alert')).toHaveTextContent('permission');
    expect(api.get).not.toHaveBeenCalled();
  });
  it('validates each step, retains fields, clears optional hours, and only saves from review', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Save failed. Try again.'));
    mount(true);
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(api.patch).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'corrected@example.org' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Continue' }).closest('form')!);
    fireEvent.change(await screen.findByLabelText('Availability Hours Per Month'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Updated full volunteer message.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Email')).toHaveValue('corrected@example.org');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Message')).toHaveValue('Updated full volunteer message.');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/admin/submissions/record-1', {
        status: 'new',
        payload: {
          ...item.payload,
          email: 'corrected@example.org',
          message: 'Updated full volunteer message.',
          availabilityHoursPerMonth: undefined,
        },
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByText('Updated full volunteer message.')).toBeInTheDocument();
  });
});
