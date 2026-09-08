import type { Office, SiteSetting } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { Footer } from './Footer';

const state = vi.hoisted(() => ({
  offices: [] as Office[],
  site: undefined as SiteSetting | undefined,
}));

vi.mock('../../lib/content-hooks', () => ({
  useOffices: () => ({ data: { items: state.offices } }),
  useSiteSettings: () => ({ data: state.site }),
}));

const office = (overrides: Partial<Office>): Office =>
  ({
    id: 'o1',
    label: 'Head Office',
    addressLine1: 'Atlantic Tower, Airport City',
    city: 'Accra',
    country: 'Ghana',
    isPrimary: true,
    order: 1,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as Office;

const renderFooter = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </ThemeProvider>,
  );
};

describe('offices in the footer', () => {
  it('lists every office, not just the primary one', () => {
    state.offices = [
      office({}),
      office({
        id: 'o2',
        label: 'Nigeria Office',
        addressLine1: 'No. 69, Royal Anchor Estate, Kucigoro',
        city: 'Abuja',
        country: 'Nigeria',
        isPrimary: false,
      }),
    ];
    renderFooter();

    expect(screen.getByText('Head Office')).toBeInTheDocument();
    expect(screen.getByText('Nigeria Office')).toBeInTheDocument();
    expect(screen.getByText(/Atlantic Tower/)).toBeInTheDocument();
    expect(screen.getByText(/Royal Anchor Estate/)).toBeInTheDocument();
  });

  it('gives each office its own callable number', () => {
    state.offices = [
      office({ phone: '+233 50 661 9598' }),
      office({
        id: 'o2',
        label: 'Nigeria Office',
        country: 'Nigeria',
        isPrimary: false,
        phone: '+234 803 412 0307',
      }),
    ];
    renderFooter();

    // Somebody in Abuja should not be ringing Accra.
    expect(screen.getByRole('link', { name: /\+233 50 661 9598/ })).toHaveAttribute(
      'href',
      'tel:+233506619598',
    );
    expect(screen.getByRole('link', { name: /\+234 803 412 0307/ })).toHaveAttribute(
      'href',
      'tel:+2348034120307',
    );
  });

  it('omits the number for an office that has none', () => {
    state.offices = [office({ phone: undefined })];
    renderFooter();

    expect(screen.getByText('Head Office')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /tel:/ })).not.toBeInTheDocument();
  });

  it('falls back to the site address when no offices exist yet', () => {
    state.offices = [];
    state.site = {
      addressLine1: 'Atlantic Tower Airport City',
      city: 'Accra',
      country: 'Ghana',
      contactEmail: 'info@impactafricaalliance.org',
    } as SiteSetting;
    renderFooter();

    expect(screen.getByText(/Atlantic Tower Airport City, Accra, Ghana/)).toBeInTheDocument();
  });

  it('keeps places and ways to reach us in columns of their own', () => {
    state.offices = [
      office({}),
      office({ id: 'o2', label: 'Nigeria Office', city: 'Abuja', country: 'Nigeria' }),
    ];
    renderFooter();

    const offices = screen.getByRole('heading', { name: 'Offices' });
    const contact = screen.getByRole('heading', { name: 'Contact' });

    // Every office belongs under Offices, and neither address nor phone
    // number strays into the column of contact methods.
    const officeColumn = offices.parentElement as HTMLElement;
    const contactColumn = contact.parentElement as HTMLElement;
    expect(within(officeColumn).getByText('Head Office')).toBeInTheDocument();
    expect(within(officeColumn).getByText('Nigeria Office')).toBeInTheDocument();
    expect(within(contactColumn).queryByText('Head Office')).not.toBeInTheDocument();
    expect(within(contactColumn).queryByText(/Atlantic Tower/)).not.toBeInTheDocument();
  });
});
