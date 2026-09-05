import { describe, expect, it } from 'vitest';

import { getImpactMetricLayout } from './impact-metric-layout';

interface GridItem {
  columns: number;
  rows: number;
}

// Simulate ordinary CSS grid auto-placement: advance the cursor without
// backfilling earlier gaps, respecting cells occupied by a spanning item.
const placeItems = (items: GridItem[]) => {
  const cells: (number | undefined)[][] = [];
  const positions: number[] = [];
  let cursor = 0;

  const canPlace = (position: number, item: GridItem) => {
    const row = Math.floor(position / 12);
    const column = position % 12;
    if (column + item.columns > 12) return false;
    for (let y = row; y < row + item.rows; y += 1) {
      for (let x = column; x < column + item.columns; x += 1) {
        if (cells[y]?.[x] !== undefined) return false;
      }
    }
    return true;
  };

  items.forEach((item, index) => {
    while (!canPlace(cursor, item)) cursor += 1;
    positions.push(cursor);
    const row = Math.floor(cursor / 12);
    const column = cursor % 12;
    for (let y = row; y < row + item.rows; y += 1) {
      cells[y] ??= Array.from({ length: 12 });
      for (let x = column; x < column + item.columns; x += 1) {
        cells[y]![x] = index;
      }
    }
    cursor += item.columns;
  });

  return { cells, positions };
};

describe.each(['sm', 'md'] as const)('impact metric packing at %s', (breakpoint) => {
  it.each(Array.from({ length: 30 }, (_, index) => index + 1))(
    'fills every row and preserves reading order with %i metrics',
    (count) => {
      const items = Array.from({ length: count }, (_, index) => {
        const layout = getImpactMetricLayout(count, index);
        return { columns: layout[breakpoint], rows: breakpoint === 'md' ? layout.mdRowSpan : 1 };
      });
      const { cells, positions } = placeItems(items);

      expect(cells.flat()).not.toContain(undefined);
      expect(new Set(cells.flat()).size).toBe(count);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(new Set(positions).size).toBe(count);
      expect(cells.flat().length).toBe(
        items.reduce((area, item) => area + item.columns * item.rows, 0),
      );
    },
  );
});
