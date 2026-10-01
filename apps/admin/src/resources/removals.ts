import type { FieldConfig } from './types';

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '';

/**
 * An edit's body with every field the person emptied sent as null.
 *
 * The create schema turns an emptied optional field into undefined (a
 * removed photo, null in the form, is left out before validating; see
 * resourceResolver), and JSON drops undefined keys, so the PATCH never
 * mentioned the field and the old value stayed. Null is the API's "remove
 * it". A field that was empty already is left out, so an untouched blank
 * never reaches the API as a removal.
 */
export const withRemovals = (
  fields: readonly Pick<FieldConfig, 'name'>[],
  initial: Record<string, unknown>,
  body: Record<string, unknown>,
): Record<string, unknown> => {
  const next = { ...body };
  for (const { name } of fields) {
    if (next[name] !== undefined && next[name] !== null) continue;
    if (isEmpty(initial[name])) delete next[name];
    else next[name] = null;
  }
  return next;
};
