import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Controller } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { findResource } from '../../resources/registry';
import type { ResourceConfig } from '../../resources/types';
import { theme } from '../../theme/theme';

import { ResourceFormDialog } from './ResourceFormDialog';

vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  ApiError: class extends Error {},
}));

// Plain inputs, so the test is about what the dialog sends rather than the
// upload and switch widgets (ResourceFormDialog.ui.test.tsx has the real
// ones). A field never typed in keeps its loaded value.
vi.mock('./FieldRenderer', () => ({
  FieldRenderer: ({ field, control }: { field: { name: string }; control: never }) => (
    <Controller
      name={field.name}
      control={control}
      render={({ field: input, fieldState }) => (
        <label>
          {field.name}
          <input
            aria-label={field.name}
            value={typeof input.value === 'string' ? input.value : ''}
            onChange={input.onChange}
          />
          {fieldState.error && <span>{fieldState.error.message}</span>}
        </label>
      )}
    />
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const partner = {
  id: 'acme',
  name: 'Acme Foundation',
  logo: { url: 'https://res.cloudinary.com/demo/image/upload/acme.png', publicId: 'acme' },
  websiteUrl: 'https://acme.org',
  order: 2,
  isActive: true,
};

const renderDialog = (onClose: () => void) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={client}>
        <ResourceFormDialog
          resource={findResource('partners') as ResourceConfig}
          open
          initial={partner}
          onClose={onClose}
        />
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe('ResourceFormDialog', () => {
  // The partner schema used to refuse an emptied website as an invalid URL,
  // so the dialog could never save the removal.
  it('sends null for a partner’s emptied website, and the rest as it was', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce(partner);
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.change(await screen.findByLabelText('websiteUrl'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const [path, body] = vi.mocked(api.patch).mock.calls[0] as [string, unknown];
    expect(path).toBe('/admin/partners/acme');
    expect(JSON.parse(JSON.stringify(body))).toEqual({
      name: partner.name,
      logo: partner.logo,
      websiteUrl: null,
      order: partner.order,
      isActive: partner.isActive,
    });
  });

  it('leaves the website out of an edit that did not touch it', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce(partner);
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.change(await screen.findByLabelText('name'), { target: { value: 'Acme Trust' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());

    const [, body] = vi.mocked(api.patch).mock.calls[0] as [string, Record<string, unknown>];
    expect(body).toMatchObject({ name: 'Acme Trust', websiteUrl: partner.websiteUrl });
    expect(Object.values(body)).not.toContain(null);
  });
});
