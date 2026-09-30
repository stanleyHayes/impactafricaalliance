import { describe, expect, it } from 'vitest';

import { TEAM_TIER_LABELS, TEAM_TIERS } from '../enums.js';

import {
  AMBASSADOR_COUNTRY_MESSAGE,
  teamMemberInputSchema,
  teamMemberUpdateSchema,
} from './team.js';

const member = { name: 'Kadiatou Ouattara', role: 'Ambassador' };

describe('ambassadors', () => {
  it('lists Ambassadors after the country and regional teams', () => {
    expect(TEAM_TIERS.indexOf('ambassador')).toBe(TEAM_TIERS.indexOf('non-executive') + 1);
    expect(TEAM_TIER_LABELS.ambassador).toBe('Ambassadors');
  });

  it('keeps Ambassadors last, so every country director is listed above them', () => {
    // Country directors sit in Functional Directors or Country & Regional
    // Teams; whatever order the other groups take, Ambassadors come after both.
    expect(TEAM_TIERS.at(-1)).toBe('ambassador');
  });

  it('refuses an ambassador without a country, on the country field', () => {
    const result = teamMemberInputSchema.safeParse({ ...member, tier: 'ambassador' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['country'],
      message: AMBASSADOR_COUNTRY_MESSAGE,
    });
  });

  it('accepts an ambassador with a country', () => {
    const parsed = teamMemberInputSchema.parse({ ...member, tier: 'ambassador', country: 'ML' });
    expect(parsed.country).toBe('ML');
  });

  it('treats an untouched country as none for everyone else', () => {
    const parsed = teamMemberInputSchema.parse({ ...member, tier: 'board', country: '' });
    expect(parsed.country).toBeUndefined();
  });

  it('only accepts countries from the list', () => {
    expect(
      teamMemberInputSchema.safeParse({ ...member, tier: 'ambassador', country: 'XX' }).success,
    ).toBe(false);
  });
});

describe('editing a team member', () => {
  it('changes nothing it is not given', () => {
    expect(teamMemberUpdateSchema.parse({})).toEqual({});
  });

  it('clears a country with null or an empty choice', () => {
    expect(teamMemberUpdateSchema.parse({ country: null })).toEqual({ country: null });
    expect(teamMemberUpdateSchema.parse({ country: '' })).toEqual({ country: null });
  });

  it('leaves the ambassador rule to the whole record, so an edit to the order alone passes', () => {
    expect(teamMemberUpdateSchema.safeParse({ order: 3 }).success).toBe(true);
  });
});
