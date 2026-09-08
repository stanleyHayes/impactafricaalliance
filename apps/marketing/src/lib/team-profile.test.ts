import type { TeamMember } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import { memberSocials } from './team-profile';

const member = {
  id: 't1',
  name: 'Jemimah Opata',
  role: 'Country Director, Ghana',
  tier: 'executive',
  order: 3,
  isActive: true,
  createdAt: '2026-09-08T00:00:00.000Z',
  updatedAt: '2026-09-08T00:00:00.000Z',
  linkedInUrl: 'https://linkedin.com/in/jemimah',
  xUrl: 'https://x.com/jemimah',
  instagramUrl: 'https://instagram.com/jemimah',
  websiteUrl: 'https://jemimah.example',
} as TeamMember;

const labels = (enabled?: Parameters<typeof memberSocials>[1]): string[] =>
  memberSocials(member, enabled).map((social) => social.label);

describe('the links shown on a team profile', () => {
  it('shows LinkedIn alone when nobody has said otherwise', () => {
    // A colleague's personal X or Instagram is theirs; linking it from a staff
    // page puts the organisation's name beside whatever is posted there.
    expect(labels()).toEqual(['LinkedIn']);
  });

  it('shows a channel once it is switched on', () => {
    expect(labels({ linkedInUrl: true, websiteUrl: true })).toEqual(['Website', 'LinkedIn']);
  });

  it('hides one that has been switched off', () => {
    expect(labels({ linkedInUrl: false })).toEqual([]);
  });

  it('keeps the addresses on the record while a channel is off', () => {
    // Switching X back on shows it again, with nobody re-entering anything.
    expect(labels({ linkedInUrl: true, xUrl: true })).toEqual(['LinkedIn', 'X']);
  });

  it('still ignores a link that is not a URL', () => {
    const dubious = { ...member, linkedInUrl: 'jemimah-on-linkedin' } as TeamMember;

    expect(memberSocials(dubious, { linkedInUrl: true })).toEqual([]);
  });
});
