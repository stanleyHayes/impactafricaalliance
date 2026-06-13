/**
 * Typed application errors. Services throw these; the error middleware
 * translates them into a consistent JSON body. Anything that is not an
 * `AppError` is treated as an unexpected 500 and never leaks internals.
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly details?: unknown;

  protected constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = 'VALIDATION_ERROR';
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, details);
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';
  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';
  constructor(message = 'You do not have permission to perform this action') {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';
  constructor(message = 'Resource already exists') {
    super(message);
  }
}

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly code = 'SERVICE_UNAVAILABLE';
  constructor(message = 'A required service is not configured') {
    super(message);
  }
}
