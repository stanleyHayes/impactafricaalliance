import type { SiteSetting } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSiteSettings } from '../lib/content-hooks';
import { renderWithProviders } from '../test/test-utils';

import { SocialLinks } from './SocialLinks';

vi.mock('../lib/content-hooks', () => ({ useSiteSettings: vi.fn() }));

const render = (site?: Partial<SiteSetting>): void => {
  vi.mocked(useSiteSettings).mockReturnValue({ data: site } as ReturnType<typeof useSiteSettings>);
  renderWithProviders(<SocialLinks />);
};

describe('which channels the site points people at', () => {
  it('shows only LinkedIn when nobody has said otherwise', () => {
    // Every account used to appear because a URL for it was compiled in, so
    // the site advertised channels nobody was posting to.
    render({});

    expect(screen.getByRole('link', { name: 'LinkedIn' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Instagram' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'TikTok' })).not.toBeInTheDocument();
  });

  it('shows a channel once it is switched on', () => {
    render({ socialsEnabled: { linkedin: true, instagram: true } });

    expect(screen.getByRole('link', { name: 'Instagram' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument();
  });

  it('hides one that has been switched off, address and all', () => {
    render({
      socialsEnabled: { linkedin: false },
      socials: { linkedin: 'https://linkedin.com/company/iaa' },
    } as Partial<SiteSetting>);

    expect(screen.queryByRole('link', { name: 'LinkedIn' })).not.toBeInTheDocument();
  });

  it('keeps the address so switching back on needs no hunting', () => {
    // The URL stays in settings while the switch is off; this is the state
    // right after it is switched on again.
    render({
      socialsEnabled: { linkedin: true },
      socials: { linkedin: 'https://linkedin.com/company/iaa-custom' },
    } as Partial<SiteSetting>);

    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com/company/iaa-custom',
    );
  });
});
