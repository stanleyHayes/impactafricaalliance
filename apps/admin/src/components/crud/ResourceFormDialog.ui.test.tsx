import { clearableDate } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { api } from '../../lib/api-client';
import { findResource } from '../../resources/registry';
import type { ResourceConfig, ResourceRow } from '../../resources/types';
import { theme } from '../../theme/theme';

import { ResourceFormDialog } from './ResourceFormDialog';

// The real fields: what an editor sees and clicks in the dialog.
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      role: 'admin',
      permissions: ['partners:read', 'partners:create', 'partners:update', 'media:create'],
    },
  }),
}));
vi.mock('../../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  ApiError: class extends Error {},
}));

const INCOMPLETE = 'Finish typing the date and time, or clear the field.';
const HELD_BACK = 'Please complete the highlighted fields before saving.';

beforeEach(() => {
  // Desktop mode, where the parts of a date are typed in the field.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

/** The dialog open on a record (or a new one), and the close it calls once saved. */
const openDialog = (resource: ResourceConfig, initial: ResourceRow | null) => {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <QueryClientProvider client={client}>
          <ResourceFormDialog resource={resource} open initial={initial} onClose={onClose} />
        </QueryClientProvider>
      </LocalizationProvider>
    </ThemeProvider>,
  );
  return onClose;
};

describe('a date in the dialog', () => {
  // No dialog resource has a date yet; this one is built like the CMS's.
  const notices: ResourceConfig = {
    key: 'notices',
    label: 'Notices',
    singular: 'Notice',
    columns: [],
    defaultValues: {},
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'startsAt', label: 'Starts (optional)', type: 'datetime' },
    ],
    createSchema: z.object({ title: z.string().min(1), startsAt: clearableDate }),
    renderPreview: (values) => <p>Preview of {String(values.title)}</p>,
  };
  // 9:30 in the morning wherever the tests run, so the parts read the same everywhere.
  const notice = { id: 'n1', title: 'Open day', startsAt: dayjs('2026-11-02T09:30').toISOString() };

  const deleteYear = async (): Promise<HTMLElement> => {
    const year = await screen.findByRole('spinbutton', { name: 'Year' });
    fireEvent.mouseDown(year);
    fireEvent.keyDown(year, { key: 'Delete' });
    expect(await screen.findByText(INCOMPLETE)).toBeInTheDocument();
    return year;
  };

  // The field keeps the saved date while a part is missing, which passes the
  // schema: Save must wait rather than send it, or send it as removed.
  it('is not saved while half typed, and then saves the date typed', async () => {
    vi.mocked(api.patch).mockResolvedValue(notice);
    const onClose = openDialog(notices, notice);
    const year = await deleteYear();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(HELD_BACK)).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();

    for (const digit of ['2', '0', '2', '7']) {
      year.textContent = digit;
      fireEvent.input(year);
    }
    await waitFor(() => expect(screen.queryByText(HELD_BACK)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith('/admin/notices/n1', {
      title: notice.title,
      startsAt: dayjs('2027-11-02T09:30').toISOString(),
    });
  });

  it('brings the form back when Save is pressed while previewing', async () => {
    openDialog(notices, notice);
    await deleteYear();
    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(HELD_BACK)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Edit' })).toHaveAttribute('aria-selected', 'true');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('removes the date when it is cleared', async () => {
    vi.mocked(api.patch).mockResolvedValue(notice);
    const onClose = openDialog(notices, notice);
    fireEvent.click(await screen.findByRole('button', { name: 'Clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.patch).toHaveBeenCalledWith('/admin/notices/n1', {
      title: notice.title,
      startsAt: null,
    });
  });
});

describe('a required picture in the dialog', () => {
  const partners = findResource('partners') as ResourceConfig;
  const partner = {
    id: 'acme',
    name: 'Acme Foundation',
    logo: { url: 'https://res.cloudinary.com/demo/image/upload/acme.png', publicId: 'acme' },
    order: 2,
    isActive: true,
  };

  // The schema's own words were "Invalid input: expected object, received undefined".
  it('asks for one in plain words once it is removed, and does not save', async () => {
    openDialog(partners, partner);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Choose a picture.')).toBeInTheDocument();
    expect(screen.queryByText(/expected object/)).not.toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('asks the same of a new partner without one', async () => {
    openDialog(partners, null);
    fireEvent.change(await screen.findByRole('textbox', { name: 'Name' }), {
      target: { value: 'Acme Foundation' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Choose a picture.')).toBeInTheDocument();
    expect(screen.queryByText(/expected object/)).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});
