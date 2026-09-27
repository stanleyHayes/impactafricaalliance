import type { AnswerProblem } from '@iaa/shared';

import { AppError, NotFoundError, ValidationError } from '../../common/errors.js';

/**
 * Why a published form is not taking this request right now. Sent as
 * `details.reason` so the applicant's page can show the right screen without
 * reading the message.
 */
export type FormUnavailableReason = 'not-yet-open' | 'closed' | 'limit-reached' | 'drafts-off';

/**
 * 409: the form exists and is public, but is not open for this. The code
 * stays `CONFLICT`, like every other 409, so generic error handling still
 * works; `details.reason` says which case it is.
 */
export class FormUnavailableError extends AppError {
  readonly statusCode = 409;
  readonly code = 'CONFLICT';
  constructor(message: string, reason: FormUnavailableReason) {
    super(message, { reason });
  }
}

/**
 * 404 for a draft token that reaches nothing. The same answer whether the
 * token was never valid, has expired or belongs to a submitted application,
 * so a guesser learns nothing from the difference.
 */
export const draftNotFound = (): NotFoundError => new NotFoundError('Application draft');

/**
 * 400 with one detail per answer, each at `answers.<fieldId>`, so the
 * applicant's page can put the message beside the question. `stepId` says
 * which screen to send them back to.
 */
export const answerProblemsError = (
  message: string,
  problems: readonly AnswerProblem[],
): ValidationError =>
  new ValidationError(
    message,
    problems.map((problem) => ({
      path: `answers.${problem.fieldId}`,
      message: problem.message,
      stepId: problem.stepId,
    })),
  );
