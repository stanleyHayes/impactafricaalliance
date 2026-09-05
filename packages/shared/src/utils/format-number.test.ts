import { describe, expect, it } from 'vitest';

import { formatCompactNumber, formatStatValue } from './format-number.js';

describe('formatCompactNumber', () => {
  it('leaves anything under a thousand alone', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(7)).toBe('7');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('abbreviates thousands, millions and billions', () => {
    expect(formatCompactNumber(1_000)).toBe('1K');
    expect(formatCompactNumber(1_500)).toBe('1.5K');
    expect(formatCompactNumber(3_400_000)).toBe('3.4M');
    expect(formatCompactNumber(1_234_567_890)).toBe('1.2B');
  });

  it('drops a trailing .0 rather than padding it', () => {
    expect(formatCompactNumber(2_000_000)).toBe('2M');
    expect(formatCompactNumber(500_000)).toBe('500K');
  });

  it('omits the decimal once the figure reaches three digits', () => {
    expect(formatCompactNumber(340_000_000)).toBe('340M');
    expect(formatCompactNumber(120_500)).toBe('121K');
  });

  it('keeps negatives signed', () => {
    expect(formatCompactNumber(-1_500)).toBe('-1.5K');
  });

  it('falls back to zero for values that are not finite', () => {
    expect(formatCompactNumber(Number.NaN)).toBe('0');
    expect(formatCompactNumber(Number.POSITIVE_INFINITY)).toBe('0');
  });

  it('appends a stat suffix without inserting a space', () => {
    expect(formatStatValue(500, '+')).toBe('500+');
    expect(formatStatValue(1_234_567_890, '+')).toBe('1.2B+');
    expect(formatStatValue(3, '')).toBe('3');
    expect(formatStatValue(42)).toBe('42');
  });
});
