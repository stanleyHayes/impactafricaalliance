import { ORG } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

describe('Contact page', () => {
  it('presents contact details and routes specialised enquiries', () => {
    renderWithProviders(<Contact />);

    expect(
      screen.getByRole('heading', { name: "Let's build something meaningful together." }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: ORG.email })).toHaveAttribute(
      'href',
      `mailto:${ORG.email}`,
    );
    expect(screen.getByText('Ghana')).toBeInTheDocument();
    expect(screen.getByText('Sierra Leone')).toBeInTheDocument();
    expect(screen.getByText('Nigeria')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /partnership enquiries/i })).toHaveAttribute(
      'href',
      '/get-involved#partner',
    );
    expect(screen.getByRole('link', { name: /join the network/i })).toHaveAttribute(
      'href',
      '/get-involved#volunteer',
    );
  });
});
