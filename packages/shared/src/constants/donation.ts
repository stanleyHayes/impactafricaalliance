/**
 * Donation impact tiers (docs/website-content.md — Get Involved → Donate).
 * Amounts are in whole USD; the API converts to minor units per provider.
 */

export interface DonationTier {
  readonly amountUsd: number;
  readonly impact: string;
}

export const DONATION_TIERS: readonly DonationTier[] = [
  { amountUsd: 25, impact: 'Provides digital learning materials for one youth participant' },
  { amountUsd: 100, impact: 'Covers a 3-month online course subscription for one learner' },
  { amountUsd: 500, impact: 'Funds one Career Launchpad employability workshop for a youth cohort' },
  {
    amountUsd: 1000,
    impact: 'Sponsors a woman through the full entrepreneurship and mentorship program',
  },
  { amountUsd: 5000, impact: 'Equips an entire Digital Skills Hub cohort of 20 youth' },
];

export const DONATION_PRESET_AMOUNTS_USD: readonly number[] = [25, 50, 100, 500];

export const DONATION_LIMITS = {
  minUsd: 1,
  maxUsd: 100000,
} as const;
