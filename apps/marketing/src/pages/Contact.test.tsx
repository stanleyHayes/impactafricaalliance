import { ORG, type SiteSetting } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSiteSettings } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import Contact from './Contact';

vi.mock('../lib/mutations', () => ({
  useSubmitForm: () => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}));

vi.mock('../lib/content-hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useSiteSettings: vi.fn() };
});

const mockSiteSettings = (data: SiteSetting | undefined): void => {
  vi.mocked(useSiteSettings).mockReturnValue({ data } as ReturnType<typeof useSiteSettings>);
};

const siteSettings: SiteSetting = {
  id: 'site-1',
  key: 'site',
  siteName: 'Impact Africa Alliance',
  contactEmail: 'info@impactafricaalliance.org',
  contactPhone: '+233 50 661 9598',
  whatsappPhone: '+233 50 661 9598',
  alternatePhone: '+234 800 000 0000',
  alternatePhoneLabel: 'Nigeria',
  addressLine1: 'Atlantic Tower Airport City',
  city: 'Accra',
  country: 'Ghana',
  regionalPresence: ['Nigeria', 'Sierra Leone'],
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
};

describe('Contact page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('presents contact details and routes specialised enquiries', () => {
    mockSiteSettings(undefined);

    renderWithProviders(<Contact />);

    expect(
      screen.getByRole('heading', { name: "Let's build something meaningful together." }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ORG.email })).toHaveAttribute(
      'href',
      `mailto:${ORG.email}`,
    );
    expect(screen.getByRole('link', { name: /partnership enquiries/i })).toHaveAttribute(
      'href',
      '/get-involved#partner',
    );
    expect(screen.getByRole('link', { name: /join the network/i })).toHaveAttribute(
      'href',
      '/get-involved#volunteer',
    );
  });

  it('falls back to the static regions before site settings resolve', () => {
    mockSiteSettings(undefined);

    renderWithProviders(<Contact />);

    expect(screen.getByText('Nigeria')).toBeInTheDocument();
    expect(screen.getByText('Sierra Leone')).toBeInTheDocument();
  });

  it('renders contact details managed in the CMS', () => {
    mockSiteSettings(siteSettings);

    renderWithProviders(<Contact />);

    expect(screen.getByRole('link', { name: '+233 50 661 9598' })).toHaveAttribute(
      'href',
      'https://wa.me/233506619598',
    );
    expect(
      screen.getByText('Nigeria', { selector: 'span.MuiTypography-overline' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+234 800 000 0000' })).toHaveAttribute(
      'href',
      'tel:+2348000000000',
    );
    expect(screen.getByText('Atlantic Tower Airport City, Accra — Ghana')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: siteSettings.contactEmail })).toHaveAttribute(
      'href',
      `mailto:${siteSettings.contactEmail}`,
    );
  });
});
