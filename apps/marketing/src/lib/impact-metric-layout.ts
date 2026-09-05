export interface ImpactMetricLayout {
  sm: number;
  md: number;
  mdRowSpan: number;
}

const getDesktopSpan = (count: number, index: number): number => {
  if (count < 2) return 12;
  if (count === 2) return 6;
  if (index === 0) return 4;
  if (count === 3 || (count === 4 && index === 3)) return 8;
  if (index < 5) return 4;

  // After the lead and its four neighbours, fill any incomplete final row.
  const finalRowCount = (count - 5) % 3;
  return finalRowCount > 0 && index >= count - finalRowCount ? 12 / finalRowCount : 4;
};

/** Column spans for an ordered, 12-column grid with naturally sized rows. */
export const getImpactMetricLayout = (count: number, index: number): ImpactMetricLayout => ({
  sm: count % 2 === 1 && index === count - 1 ? 12 : 6,
  md: getDesktopSpan(count, index),
  mdRowSpan: count >= 3 && index === 0 ? 2 : 1,
});
