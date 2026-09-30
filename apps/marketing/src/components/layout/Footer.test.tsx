import {
  FOOTER_LEGAL_LINKS,
  PILLARS,
  PRIMARY_NAV,
  type Office,
  type SiteSetting,
} from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findProgram } from '../../content/programs';
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

/** The one-line summary the footer shows for a programme. */
const summaryOf = (key: string): string => findProgram(key)?.summary ?? '';

const renderFooter = (): void => {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </ThemeProvider>,
  );
};

beforeEach(() => {
  state.offices = [];
  state.site = undefined;
});

describe('navigation in the footer', () => {
  it('links every primary page by its name, with an icon a screen reader skips', () => {
    renderFooter();

    for (const page of PRIMARY_NAV) {
      const link = screen.getByRole('link', { name: page.label });
      expect(link).toHaveAttribute('href', page.path);
      // The icon decorates the name; it must not become part of it.
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('keeps the legal pages, the cookie choices and both calls to action', () => {
    renderFooter();

    for (const page of FOOTER_LEGAL_LINKS) {
      expect(screen.getByRole('link', { name: page.label })).toHaveAttribute('href', page.path);
    }
    expect(screen.getByRole('button', { name: 'Manage cookies' })).toBeInTheDocument();
    // The bars between them are drawn, not written, so nothing reads out "vertical bar".
    expect(screen.queryByText('|')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Partner with us/ })).toHaveAttribute(
      'href',
      '/get-involved#partner',
    );
    expect(screen.getByRole('link', { name: /Email us/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:/),
    );
  });
});

describe('initiatives in the footer', () => {
  it('shows what each initiative is, not only its name', () => {
    renderFooter();

    for (const pillar of PILLARS) {
      const link = screen.getByRole('link', { name: pillar.title });
      expect(link).toHaveAttribute('href', pillar.path);
      expect(within(link).getByText(summaryOf(pillar.key))).toBeInTheDocument();
    }
  });

  it('names each initiative link by its title and describes it by its summary', () => {
    renderFooter();

    for (const pillar of PILLARS) {
      const link = screen.getByRole('link', { name: pillar.title });
      // The summary is announced after the name instead of being read as it.
      expect(link).toHaveAccessibleDescription(summaryOf(pillar.key));
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('gives every initiative a summary short enough to show whole in its card', () => {
    for (const pillar of PILLARS) {
      const summary = summaryOf(pillar.key);
      expect(summary, pillar.key).not.toBe('');
      // About 45 characters is what fits on one line of the narrowest desktop card.
      expect(summary.length, summary).toBeLessThanOrEqual(45);
    }
  });
});

describe('contact details in the footer', () => {
  it('offers the email address and the WhatsApp number from Site Settings', () => {
    state.site = {
      contactEmail: 'hello@impactafricaalliance.org',
      whatsappPhone: '+233 20 000 0000',
    } as SiteSetting;
    renderFooter();

    const email = screen.getByRole('link', { name: 'hello@impactafricaalliance.org' });
    expect(email).toHaveAttribute('href', 'mailto:hello@impactafricaalliance.org');
    // Named outright: Chrome would otherwise read the break after the "@" as a space.
    expect(email).toHaveAttribute('aria-label', 'hello@impactafricaalliance.org');
    expect(screen.getByRole('link', { name: '+233 20 000 0000' })).toHaveAttribute(
      'href',
      'https://wa.me/233200000000',
    );
  });
});

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

  it('names the countries the alliance works in', () => {
    renderFooter();

    expect(screen.getByText('Ghana · Nigeria · Sierra Leone')).toBeInTheDocument();
  });

  it('keeps places and ways to reach us under headings of their own', () => {
    state.offices = [
      office({}),
      office({ id: 'o2', label: 'Nigeria Office', city: 'Abuja', country: 'Nigeria' }),
    ];
    renderFooter();

    const offices = screen.getByRole('heading', { name: 'Offices' });
    const contact = screen.getByRole('heading', { name: 'Contact' });

    // Every office belongs under Offices, and neither address nor phone
    // number strays into the list of contact methods above it.
    const officeSection = offices.parentElement as HTMLElement;
    const contactSection = contact.parentElement as HTMLElement;
    expect(within(officeSection).getByText('Head Office')).toBeInTheDocument();
    expect(within(officeSection).getByText('Nigeria Office')).toBeInTheDocument();
    expect(within(contactSection).queryByText('Head Office')).not.toBeInTheDocument();
    expect(within(contactSection).queryByText(/Atlantic Tower/)).not.toBeInTheDocument();
  });
});
