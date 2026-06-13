import type { ApiErrorBody } from '@iaa/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

import type { AppLogger } from '../config/logger.js';

import { AppError, ConflictError, NotFoundError, ValidationError } from './errors.js';

const DUPLICATE_KEY_CODE = 11000;

/** Map known third-party/database errors onto our typed AppError hierarchy. */
const normalise = (error: unknown): AppError | null => {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof MongooseError.ValidationError) {
    return new ValidationError('Validation failed', Object.keys(error.errors));
  }
  if (error instanceof MongooseError.CastError) {
    return new ValidationError(`Invalid value for "${error.path}"`);
  }
  if (error instanceof MongoServerError && error.code === DUPLICATE_KEY_CODE) {
    return new ConflictError('A record with these details already exists');
  }
  return null;
};

/** 404 fallback for unmatched routes. */
export const notFoundHandler: RequestHandler = (req) => {
  throw new NotFoundError(`Route ${req.method} ${req.path}`);
};

/** Central error handler — the single place that shapes error responses. */
export const errorMiddleware =
  (logger: AppLogger): ErrorRequestHandler =>
  (error, _req, res, _next) => {
    const appError = normalise(error);

    if (!appError) {
      logger.error({ err: error }, 'Unhandled error');
      const body: ApiErrorBody = {
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      };
      res.status(500).json(body);
      return;
    }

    if (appError.statusCode >= 500) {
      logger.error({ err: appError }, appError.message);
    }

    const body: ApiErrorBody = {
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details === undefined ? {} : { details: appError.details }),
      },
    };
    res.status(appError.statusCode).json(body);
  };
