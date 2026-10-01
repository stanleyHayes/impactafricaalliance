import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';

type Values = Record<string, unknown>;

/** The values without the fields someone emptied. */
const withoutNulls = (values: Values): Values =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null));

/**
 * What the create schema fills in for a field left empty (an order's 0, a
 * popup's three-second delay), or undefined when it fills in nothing.
 */
export const schemaDefault = (schema: ZodTypeAny, name: string): unknown => {
  const field = (schema as { shape?: Record<string, ZodTypeAny> }).shape?.[name];
  try {
    const parsed = field?.safeParse(undefined);
    return parsed?.success ? parsed.data : undefined;
  } catch {
    // A transform that cannot take undefined fills in nothing.
    return undefined;
  }
};

/**
 * A resource form's validation, against the resource's create schema.
 *
 * An emptied control holds null rather than undefined: react-hook-form shows
 * a field's default in place of undefined, which on an edit page is the
 * stored value, so a removed photo stayed on screen. The create schemas
 * describe a missing value as absent, and refuse null for most optional
 * fields, so nulls are left out before validating. An edit still sends each
 * emptied field as null ("remove it", see withRemovals).
 */
export const resourceResolver = (schema: ZodTypeAny): Resolver<Values> => {
  // The generic resource schema's input type is `unknown`; bypass the
  // resolver's FieldValues constraint and assert the form's value type.
  const resolve = zodResolver(schema as never) as Resolver<Values>;
  return (values, context, options) => resolve(withoutNulls(values), context, options);
};
