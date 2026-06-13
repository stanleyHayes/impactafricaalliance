import { ZodError, type ZodTypeAny, type z } from 'zod';

import { ValidationError } from './errors.js';

interface ZodIssueView {
  path: string;
  message: string;
}

const toIssues = (error: ZodError): ZodIssueView[] =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

/**
 * Parse `data` with a Zod schema, throwing a typed `ValidationError`
 * (HTTP 400 with field-level details) when validation fails.
 */
export const parseWith = <Schema extends ZodTypeAny>(
  schema: Schema,
  data: unknown,
): z.infer<Schema> => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Validation failed', toIssues(error));
    }
    throw error;
  }
};
