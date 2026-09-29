import { describe, expect, it } from 'vitest';

import {
  EMPTY_DATE_PARTS,
  calendarDateProblem,
  daysInMonth,
  formatDateKey,
  isCompleteDate,
  partsFromValue,
  valueFromParts,
} from './calendar-date';

describe('turning Day / Month / Year into the stored value', () => {
  it('stores a finished date as YYYY-MM-DD, padding the day and month', () => {
    expect(valueFromParts({ day: '5', month: '10', year: '2026' })).toBe('2026-10-05');
    expect(valueFromParts({ day: '28', month: '2', year: '2027' })).toBe('2027-02-28');
  });

  it('stores nothing at all when every part is empty', () => {
    expect(valueFromParts(EMPTY_DATE_PARTS)).toBe('');
  });

  it('keeps an unfinished date in the same shape, so a saved draft brings it back', () => {
    expect(valueFromParts({ day: '3', month: '', year: '' })).toBe('--03');
    expect(valueFromParts({ day: '', month: '2', year: '2026' })).toBe('2026-02-');
    expect(partsFromValue('2026-02-')).toEqual({ day: '', month: '2', year: '2026' });
    expect(partsFromValue('--03')).toEqual({ day: '03', month: '', year: '' });
  });

  it('reads a stored date, and the day of an ISO instant, back into parts', () => {
    expect(partsFromValue('2026-10-05')).toEqual({ day: '05', month: '10', year: '2026' });
    expect(partsFromValue('2026-10-05T12:00:00.000Z')).toEqual({
      day: '05',
      month: '10',
      year: '2026',
    });
  });

  it('gives empty parts for anything it cannot read', () => {
    expect(partsFromValue('next Tuesday')).toEqual(EMPTY_DATE_PARTS);
    expect(partsFromValue('2026-13-05').month).toBe('');
  });
});

describe('checking a date', () => {
  it('accepts real days, including 29 February in a leap year', () => {
    expect(calendarDateProblem('2026-10-05')).toBeNull();
    expect(calendarDateProblem('2028-02-29')).toBeNull();
    expect(isCompleteDate('2028-02-29')).toBe(true);
  });

  it('says a day does not exist rather than accepting 31 February', () => {
    expect(calendarDateProblem('2027-02-31')).toBe(
      'February 2027 has 28 days. Check the day and month.',
    );
    expect(calendarDateProblem('2027-02-29')).toMatch(/February 2027 has 28 days/);
    expect(calendarDateProblem('2026-04-31')).toMatch(/April 2026 has 30 days/);
    expect(isCompleteDate('2027-02-31')).toBe(false);
  });

  it('names the parts that are missing', () => {
    expect(calendarDateProblem('2026-02-')).toBe('The date needs a day.');
    expect(calendarDateProblem('--03')).toBe('The date needs a month and year.');
    expect(calendarDateProblem('-02-')).toBe('The date needs a day and year.');
  });

  it('asks for the year in full and a day that could exist', () => {
    expect(calendarDateProblem('26-02-03')).toMatch(/year in full/);
    expect(calendarDateProblem('2026-02-00')).toBe('Enter a day from 1 to 31.');
    expect(calendarDateProblem('2026-01-32')).toBe('Enter a day from 1 to 31.');
  });

  it('respects the earliest and latest days allowed', () => {
    const limits = { min: '2026-01-01', max: '2026-12-31' };
    expect(calendarDateProblem('2025-12-31', limits)).toBe(
      'Enter a date on or after 1 January 2026.',
    );
    expect(calendarDateProblem('2027-01-01', limits)).toBe(
      'Enter a date on or before 31 December 2026.',
    );
    expect(calendarDateProblem('2026-06-15', limits)).toBeNull();
  });

  it('leaves an empty date to the question’s own required check', () => {
    expect(calendarDateProblem('')).toBeNull();
    expect(calendarDateProblem('whenever')).toBe('Enter a date.');
  });
});

describe('dates for people to read', () => {
  it('writes a stored day out in words', () => {
    expect(formatDateKey('2026-10-05')).toBe('5 October 2026');
    expect(formatDateKey('not a date')).toBe('not a date');
  });

  it('knows how long each month is', () => {
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});
