import { describe, expect, it } from 'vitest';

import { shiftMonth } from './event-calendar';

describe('calendar month navigation', () => {
  it('visits February when advancing from January 31', () => {
    const next = shiftMonth(new Date(2030, 0, 31), 1);
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2030, 1, 1]);
  });
  it('moves back across the year boundary', () => {
    const previous = shiftMonth(new Date(2030, 0, 31), -1);
    expect([previous.getFullYear(), previous.getMonth(), previous.getDate()]).toEqual([2029, 11, 1]);
  });
});
