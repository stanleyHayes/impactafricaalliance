import type { SiteSetting, SiteSettingUpdate } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSiteSettings, useUpdateSiteSettings } from '../lib/admin-hooks';
import { theme } from '../theme/theme';

import SiteSettings from './SiteSettings';

vi.mock('../lib/admin-hooks', () => ({
  useSiteSettings: vi.fn(),
  useUpdateSiteSettings: vi.fn(),
}));

const savedSettings: SiteSetting = {
  id: 'site-settings',
  key: 'site',
  siteName: 'Impact Africa Alliance',
  contactEmail: 'hello@impact.example',
  contactPhone: '+233 123 456 789',
  addressLine1: 'Atlantic Tower',
  city: 'Accra',
  country: 'Ghana',
  regionalPresence: ['Nigeria', 'Sierra Leone'],
  announcement: { enabled: true, message: 'Welcome to the alliance' },
  popup: { enabled: true, title: 'Join us', delaySeconds: 2 },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const save = vi.fn<(values: SiteSettingUpdate) => Promise<SiteSetting>>();

const setLoadedSettings = (data: SiteSetting): void => {
  vi.mocked(useSiteSettings).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useSiteSettings>);
};

beforeEach(() => {
  setLoadedSettings(savedSettings);
  save.mockImplementation(async (values) => ({ ...savedSettings, ...values }) as SiteSetting);
  vi.mocked(useUpdateSiteSettings).mockReturnValue({
    mutateAsync: save,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useUpdateSiteSettings>);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const element = (): JSX.Element => (
  <ThemeProvider theme={theme}>
    <SiteSettings />
  </ThemeProvider>
);

describe('SiteSettings steps', () => {
  it('validates the current step, preserves edits between steps, and resists background refetch resets', async () => {
    setLoadedSettings({ ...savedSettings, contactEmail: 'invalid' });
    const view = render(element());
    fireEvent.change(screen.getByLabelText('Site name'), { target: { value: 'Alliance updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByRole('heading', { name: 'How people can reach you' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Site name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Contact email')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(screen.getByRole('heading', { name: 'How people can reach you' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: 'team@impact.example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText('Site name')).toHaveValue('Alliance updated');

    setLoadedSettings({ ...savedSettings, siteName: 'External change' });
    view.rerender(element());
    expect(screen.getByLabelText('Site name')).toHaveValue('Alliance updated');
    expect(save).not.toHaveBeenCalled();
  });

  it('opens hidden validation errors and saves numeric popup timing with values from other steps', async () => {
    setLoadedSettings({ ...savedSettings, contactEmail: 'invalid' });
    render(element());
    fireEvent.change(screen.getByLabelText('Site name'), { target: { value: 'Alliance updated' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Video & chat' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { name: 'How people can reach you' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Contact email')).toHaveAttribute('aria-invalid', 'true');
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Contact email'), {
      target: { value: 'team@impact.example' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Popup action' }));
    fireEvent.change(await screen.findByLabelText('Delay (seconds)'), { target: { value: '65' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Delay (seconds)')).toHaveAttribute('aria-invalid', 'true'),
    );
    fireEvent.change(screen.getByLabelText('Delay (seconds)'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Video & chat' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        siteName: 'Alliance updated',
        contactEmail: 'team@impact.example',
        addressLine1: 'Atlantic Tower',
        regionalPresence: ['Nigeria', 'Sierra Leone'],
        announcement: expect.objectContaining({
          enabled: true,
          message: 'Welcome to the alliance',
        }),
        popup: expect.objectContaining({ enabled: true, title: 'Join us', delaySeconds: 7 }),
      }),
    );
    expect(await screen.findByText('Site settings saved')).toBeInTheDocument();
  });
});
