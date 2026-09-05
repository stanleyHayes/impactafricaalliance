/**
 * Abbreviate a large number for display: 1500 -> "1.5K", 3_400_000 -> "3.4M".
 *
 * Impact figures are entered as raw counts in the dashboard, and a full
 * "1,234,567,890" dominates a stat card and is harder to read at a glance than
 * "1.2B". Anything under a thousand is left alone, because "847" is already
 * the clearest form of itself.
 *
 * A trailing ".0" is dropped, so 2_000_000 reads "2M" rather than "2.0M".
 */
const UNITS = [
  { threshold: 1_000_000_000, symbol: 'B' },
  { threshold: 1_000_000, symbol: 'M' },
  { threshold: 1_000, symbol: 'K' },
] as const;

export const formatCompactNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const sign = value < 0 ? '-' : '';
  const magnitude = Math.abs(value);

  const unit = UNITS.find((candidate) => magnitude >= candidate.threshold);
  if (!unit) {
    return `${sign}${magnitude.toLocaleString()}`;
  }

  const scaled = magnitude / unit.threshold;
  // One decimal below 100 ("3.4M"), none above it ("340M") — a decimal on a
  // three-digit figure adds length without adding information.
  const rounded = scaled >= 100 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
  return `${sign}${String(rounded)}${unit.symbol}`;
};

/** The displayed figure for an impact stat: compact value plus its suffix. */
export const formatStatValue = (value: number, suffix?: string): string =>
  `${formatCompactNumber(value)}${suffix ?? ''}`;
