import { z } from 'zod';

/** Unwrap `.default()` so an absent key stays absent instead of being filled in. */
const withoutDefault = (schema: z.ZodTypeAny): z.ZodTypeAny =>
  schema instanceof z.ZodDefault ? withoutDefault(schema.def.innerType as z.ZodTypeAny) : schema;

/**
 * Build the PATCH counterpart of a create schema.
 *
 * `.partial()` on its own is not enough. A field declared with `.default()`
 * keeps that default through `.partial()`, so omitting it from a PATCH body
 * does not mean "leave this alone" — it means "reset it to the default". A
 * request sending only `{ isActive: false }` was therefore also writing
 * `status: 'draft'`, `tier: 'executive'` and `order: 0`, quietly unpublishing
 * articles and demoting board members that nobody had touched.
 *
 * Stripping the defaults first makes an omitted field genuinely absent, which
 * is what every caller already assumed a PATCH did.
 */
export const partialForUpdate = <Shape extends z.ZodRawShape>(
  input: z.ZodObject<Shape>,
): z.ZodObject<{ [K in keyof Shape]: z.ZodOptional<Shape[K]> }> =>
  z.object(
    Object.fromEntries(
      Object.entries(input.shape).map(([key, field]) => [
        key,
        withoutDefault(field as z.ZodTypeAny).optional(),
      ]),
    ),
  ) as unknown as z.ZodObject<{ [K in keyof Shape]: z.ZodOptional<Shape[K]> }>;
