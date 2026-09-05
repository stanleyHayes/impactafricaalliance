import type { Event } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import { EventQrDialog } from './EventQrDialog';

vi.mock('../../lib/api-client', () => ({ api: { get: vi.fn() } }));

const event = { id: '507f1f77bcf86cd799439011', title: 'Skills & opportunity' } as Event;
const qrCode = {
  targetUrl: `https://impact.example/events/${event.id}`,
  dataUrl: 'data:image/png;base64,event-page-image',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const setup = (client: QueryClient) => {
  const element = (open: boolean) => (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <EventQrDialog event={event} open={open} onClose={vi.fn()} />
      </ThemeProvider>
    </QueryClientProvider>
  );
  const view = render(element(true));
  return { ...view, element };
};

describe('EventQrDialog', () => {
  it('downloads the displayed PNG with the detail URL and refreshes when reopened', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['event-qr', event.id], {
      targetUrl: `https://impact.example/events#${event.id}`,
      dataUrl: 'data:image/png;base64,legacy-hash-image',
    });
    vi.mocked(api.get).mockResolvedValue(qrCode);
    const view = setup(client);

    const download = await screen.findByRole('link', { name: 'Download' });
    expect(screen.getByText(qrCode.targetUrl)).toBeInTheDocument();
    expect(download).toHaveAttribute('href', qrCode.dataUrl);
    expect(download).toHaveAttribute('download', 'iaa-skills-opportunity-qr.png');
    expect(screen.getByRole('img')).toHaveAttribute('src', qrCode.dataUrl);
    expect(api.get).toHaveBeenCalledWith(`/admin/event-registrations/${event.id}/qr`);

    view.rerender(view.element(false));
    view.rerender(view.element(true));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    await screen.findByRole('link', { name: 'Download' });
    client.clear();
  });

  it('withholds cached downloads after a failed refresh and allows retrying', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['event-qr', 'detail-page', event.id], qrCode);
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(qrCode);
    setup(client);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not generate the QR code.');
    expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      qrCode.dataUrl,
    );
    client.clear();
  });
});
