import type { AuditChange } from '@iaa/shared';

/**
 * Longest value kept on either side of a change. The log is for "what
 * changed", not a second copy of the record; a long description is cut short.
 */
export const AUDIT_VALUE_MAX_LENGTH = 200;

/** Most changed fields kept on one audit entry. */
export const MAX_AUDIT_CHANGES = 30;

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const OBJECT_ID = /^[a-f\d]{24}$/i;

const hasMethod = <K extends string>(
  value: unknown,
  method: K,
): value is Record<K, () => unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>)[method] === 'function';

const normaliseString = (value: string): string | null => {
  if (value === '') {
    return null;
  }
  if (ISO_DATETIME.test(value)) {
    const time = Date.parse(value);
    return Number.isNaN(time) ? value : new Date(time).toISOString();
  }
  return OBJECT_ID.test(value) ? value.toLowerCase() : value;
};

/**
 * One comparable shape for a value however it arrived: a Date from the
 * database or ISO text from a request, an ObjectId or its hex, a Mongoose
 * subdocument or a plain object. Empty values (undefined, null, '') all
 * become null, and object keys holding one are dropped, so "not set" and
 * "cleared" never read as a change.
 */
const normalise = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    return normaliseString(value);
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (hasMethod(value, 'toHexString')) {
    return String(value.toHexString());
  }
  if (Array.isArray(value)) {
    return value.map(normalise);
  }
  const plain = hasMethod(value, 'toObject') ? value.toObject() : value;
  return normaliseObject(plain as Record<string, unknown>);
};

const normaliseObject = (value: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const item = normalise(value[key]);
    if (item !== null) {
      result[key] = item;
    }
  }
  return result;
};

const isScalar = (value: unknown): boolean =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

// What a person reads in the activity log: plain text for text, numbers and
// lists of them; JSON for anything with structure.
const display = (value: unknown): string | null => {
  if (value === null || (Array.isArray(value) && value.length === 0)) {
    return null;
  }
  if (Array.isArray(value) && value.every(isScalar)) {
    return value.map(String).join(', ');
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

const truncate = (value: string | null): string | null =>
  value !== null && value.length > AUDIT_VALUE_MAX_LENGTH
    ? `${value.slice(0, AUDIT_VALUE_MAX_LENGTH - 1)}…`
    : value;

/**
 * The fields that differ between a stored record and an update, as short
 * text for the audit log.
 *
 * Only fields in `fields` are compared, and only those the update actually
 * sets: a key missing from `after` (or set to undefined) means "unchanged" in
 * a PATCH, so it is skipped. Pass the record as a plain object (`lean()` or
 * `toObject()`) and the parsed request body as `after`. Values are compared
 * in full and shortened only for display; see `AUDIT_VALUE_MAX_LENGTH` and
 * `MAX_AUDIT_CHANGES`.
 *
 * Leave personal data out of `fields`: the log is read by everyone who can
 * read the record, and it is kept after the record changes.
 */
export const diffFields = <Before extends object, After extends object>(
  before: Before,
  after: After,
  fields: readonly string[],
): AuditChange[] => {
  const previous = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  const changes: AuditChange[] = [];
  for (const field of fields) {
    if (next[field] === undefined) {
      continue;
    }
    const from = normalise(previous[field]);
    const to = normalise(next[field]);
    if (JSON.stringify(from) === JSON.stringify(to)) {
      continue;
    }
    changes.push({ field, from: truncate(display(from)), to: truncate(display(to)) });
    if (changes.length === MAX_AUDIT_CHANGES) {
      break;
    }
  }
  return changes;
};
