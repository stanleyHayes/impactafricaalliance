/**
 * Calendar days typed as three parts: day, month and year.
 *
 * The site asks for dates with its own Day / Month / Year field rather than
 * the browser's date input, whose picker looks different in every browser
 * and cannot be styled to match the site. The API still stores a calendar
 * day as `YYYY-MM-DD`, so this module turns the three parts into that value
 * and back, and says in plain words what is wrong with a date that is not
 * finished or does not exist.
 */

/** What the person has typed into each part. `month` is `''` or `'1'`–`'12'`. */
export interface DateParts {
  day: string;
  month: string;
  year: string;
}

/** The earliest and latest days a date may be, each `YYYY-MM-DD`. */
export interface DateLimits {
  min?: string;
  max?: string;
}

export const EMPTY_DATE_PARTS: DateParts = { day: '', month: '', year: '' };

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

// A value this field wrote: every part may be missing or short while the
// person is still typing, so `2026--05` and `-02-` both parse.
const PARTIAL_DATE = /^(\d{0,4})-(\d{0,2})-(\d{0,2})$/;
// An ISO instant (an older answer may hold one): its first ten characters are the day.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T/;

const monthPart = (text: string): string => {
  const month = Number(text);
  return text !== '' && month >= 1 && month <= 12 ? String(month) : '';
};

/** The three parts held in a stored value; anything unreadable gives empty parts. */
export const partsFromValue = (value: string): DateParts => {
  const match = PARTIAL_DATE.exec(ISO_INSTANT.test(value) ? value.slice(0, 10) : value);
  if (!match) {
    return EMPTY_DATE_PARTS;
  }
  const [, year = '', month = '', day = ''] = match;
  return { day, month: monthPart(month), year };
};

const pad = (text: string): string => (text === '' ? '' : text.padStart(2, '0'));

/**
 * The value to store for these parts: `''` when all three are empty, and
 * otherwise `year-month-day` with the day and month padded to two digits.
 * A finished, real date therefore comes out as the `YYYY-MM-DD` the API
 * expects. An unfinished one keeps its shape (`2026-02-`), so an autosaved
 * draft brings back exactly what was typed and the checks can say what is
 * missing rather than treating the question as unanswered.
 */
export const valueFromParts = ({ day, month, year }: DateParts): string =>
  day === '' && month === '' && year === '' ? '' : `${year}-${pad(month)}-${pad(day)}`;

/** How many days a month has; `month` counts from 1. */
export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** A calendar day, `YYYY-MM-DD`, as "5 October 2026". Any other text is returned as it is. */
export const formatDateKey = (key: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    return key;
  }
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1] ?? month} ${year}`;
};

const listWords = (words: readonly string[]): string =>
  words.length > 1
    ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1] ?? ''}`
    : (words[0] ?? '');

const missingProblem = (parts: DateParts): string | null => {
  const missing = (['day', 'month', 'year'] as const).filter((part) => parts[part] === '');
  return missing.length > 0 ? `The date needs a ${listWords(missing)}.` : null;
};

/** What is wrong with a finished set of parts as a day on the calendar. */
const calendarProblem = (parts: DateParts): string | null => {
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  if (parts.year.length !== 4 || year < 1000) {
    return 'Enter the year in full, with four digits, like 2026.';
  }
  if (day < 1 || day > 31) {
    return 'Enter a day from 1 to 31.';
  }
  const last = daysInMonth(year, month);
  return day > last
    ? `${MONTH_NAMES[month - 1]} ${year} has ${last} days. Check the day and month.`
    : null;
};

const limitProblem = (key: string, { min, max }: DateLimits): string | null => {
  if (min && key < min) {
    return `Enter a date on or after ${formatDateKey(min)}.`;
  }
  if (max && key > max) {
    return `Enter a date on or before ${formatDateKey(max)}.`;
  }
  return null;
};

/**
 * What is wrong with a date value, in words the person can act on, or null
 * when nothing is. An empty value is not a problem here: whether an answer
 * is needed at all is the form's own question.
 *
 * The browser's date input used to refuse 31 February silently, by showing
 * nothing; this says so instead ("February 2027 has 28 days").
 */
export const calendarDateProblem = (value: string, limits: DateLimits = {}): string | null => {
  if (value.trim() === '') {
    return null;
  }
  if (!PARTIAL_DATE.test(value) && !ISO_INSTANT.test(value)) {
    return 'Enter a date.';
  }
  const parts = partsFromValue(value);
  return (
    missingProblem(parts) ?? calendarProblem(parts) ?? limitProblem(valueFromParts(parts), limits)
  );
};

/** Whether a value is a finished, real calendar day, `YYYY-MM-DD`. */
export const isCompleteDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && calendarDateProblem(value) === null;
