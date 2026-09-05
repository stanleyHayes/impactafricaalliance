import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Controller } from 'react-hook-form';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { api } from '../lib/api-client';
import type { ResourceConfig } from '../resources/types';

import ResourceFormPage from './ResourceFormPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }));
vi.mock('../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  ApiError: class extends Error {
    status = 404;
  },
}));

const resource: ResourceConfig = {
  key: 'widgets',
  label: 'Widgets',
  singular: 'Widget',
  columns: [],
  defaultValues: {},
  fields: ['name', 'email', 'country', 'role', 'note', 'image'].map((name) => ({
    name,
    label: name,
    type: name === 'image' ? 'image' : 'text',
  })),
  createSchema: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    country: z.string().min(1),
    role: z.string().min(1),
    note: z.string().min(1),
    image: z.object({ url: z.string() }),
  }),
};
vi.mock('../resources/registry', () => ({
  findResource: (key: string) => (key === 'widgets' ? resource : undefined),
}));

vi.mock('../components/crud/FieldRenderer', () => ({
  FieldRenderer: ({
    field,
    control,
    onUploadingChange,
  }: {
    field: { name: string };
    control: never;
    onUploadingChange: (name: string, pending: boolean) => void;
  }) => (
    <Controller
      name={field.name}
      control={control}
      render={({ field: input, fieldState }) =>
        field.name === 'image' ? (
          <div>
            <button type="button" onClick={() => onUploadingChange('image', true)}>
              Start upload
            </button>
            <button
              type="button"
              onClick={() => {
                input.onChange({ url: 'https://example.com/image.jpg' });
                onUploadingChange('image', false);
              }}
            >
              Finish upload
            </button>
            {fieldState.error && <span>{fieldState.error.message}</span>}
          </div>
        ) : (
          <label>
            {field.name}
            <input
              aria-label={field.name}
              value={String(input.value ?? '')}
              onChange={input.onChange}
            />
            {fieldState.error && <span>{fieldState.error.message}</span>}
          </label>
        )
      }
    />
  ),
}));

const SwitchRecord = (): JSX.Element => {
  const navigate = useNavigate();
  return (
    <button onClick={() => void navigate('/content/widgets/second/edit')}>Switch record</button>
  );
};

const setup = (path: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <SwitchRecord />
        <Routes>
          <Route path="/content/:resource/new" element={<ResourceFormPage />} />
          <Route path="/content/:resource/:id/edit" element={<ResourceFormPage />} />
          <Route path="/content/widgets" element={<p>Widget list</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('resource form page', () => {
  it('validates each step, keeps entries when returning, blocks uploads, and saves only after review', async () => {
    vi.mocked(api.post).mockResolvedValue({ id: 'created' });
    const client = setup('/content/widgets/new');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('highlighted fields');
    const details = {
      name: 'Jane',
      email: 'jane@example.com',
      country: 'Ghana',
      role: 'Mentor',
      note: 'Hello',
    };
    Object.entries(details).forEach(([name, value]) =>
      fireEvent.change(screen.getByLabelText(name), { target: { value } }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const startUpload = await screen.findByRole('button', { name: 'Start upload' });
    fireEvent.click(startUpload);
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish upload' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('name')).toHaveValue('Jane');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    const save = await screen.findByRole('button', { name: 'Save' });
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(save);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/admin/widgets', {
        ...details,
        image: { url: 'https://example.com/image.jpg' },
      }),
    );
    expect(await screen.findByText('Widget list')).toBeInTheDocument();
    client.clear();
  });

  it('loads deep links and resets values when switching records', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ id: 'first', name: 'First name' })
      .mockResolvedValueOnce({ id: 'second', name: 'Second name' });
    const client = setup('/content/widgets/first/edit');
    expect(await screen.findByLabelText('name')).toHaveValue('First name');
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Unsaved name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Switch record' }));
    await waitFor(() => expect(screen.getByLabelText('name')).toHaveValue('Second name'));
    expect(api.get).toHaveBeenCalledWith('/admin/widgets/first');
    expect(api.get).toHaveBeenCalledWith('/admin/widgets/second');
    client.clear();
  });

  it('updates the loaded record and preserves the review after a failed save', async () => {
    const data = {
      id: 'existing',
      name: 'Jane',
      email: 'jane@example.com',
      country: 'Ghana',
      role: 'Mentor',
      note: 'Original',
      image: { url: 'https://example.com/saved.jpg' },
    };
    vi.mocked(api.get).mockResolvedValueOnce(data);
    vi.mocked(api.patch)
      .mockRejectedValueOnce(new Error('Please try again'))
      .mockResolvedValueOnce({ ...data, note: 'Updated' });
    const client = setup('/content/widgets/existing/edit');
    fireEvent.change(await screen.findByLabelText('note'), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again');
    expect(screen.getByText('Updated')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Widget list')).toBeInTheDocument();
    expect(api.patch).toHaveBeenLastCalledWith('/admin/widgets/existing', {
      name: data.name,
      email: data.email,
      country: data.country,
      role: data.role,
      note: 'Updated',
      image: data.image,
    });
    client.clear();
  });
});
