import { describe, expect, it } from 'vitest';

import { ApiError } from '../../lib/api-client';

import {
  answerProblemsFrom,
  blockedPhaseFor,
  failureKind,
  failureMessage,
  loadFailurePhase,
  unavailablePhase,
  uploadFailureMessage,
} from './errors';

const api = (status: number, message = 'Message', details?: unknown): ApiError =>
  new ApiError(status, 'CODE', message, details);

describe('failureKind', () => {
  it('reads the API’s status codes', () => {
    expect(failureKind(api(400))).toBe('validation');
    expect(failureKind(api(404))).toBe('not-found');
    expect(failureKind(api(409))).toBe('conflict');
    expect(failureKind(api(429))).toBe('rate-limited');
    expect(failureKind(api(403))).toBe('other');
  });

  it('treats an unreachable or failing server as worth another try', () => {
    expect(failureKind(new TypeError('Failed to fetch'))).toBe('retryable');
    expect(failureKind(api(502))).toBe('retryable');
    expect(failureKind(api(408))).toBe('retryable');
    expect(failureKind(new Error('Something else'))).toBe('other');
  });

  it('answers a 429 calmly, with nothing lost', () => {
    expect(failureMessage(api(429))).toMatch(
      /Wait a minute, then try again. Your answers are still here./,
    );
  });
});

describe('answerProblemsFrom', () => {
  const sent = [
    { fieldId: 'full-name', value: 'Ama' },
    { fieldId: 'email', value: 'nope' },
  ];

  it('maps answer paths, by id or by position, to their questions', () => {
    const error = api(400, 'Validation failed', [
      { path: 'answers.email', message: 'Enter an email address.' },
      { path: 'answers.0.value', message: 'Too long.' },
      { path: 'answers.7', message: 'Out of range.' },
      { path: 'currentStepId', message: 'Unknown step.' },
      { nonsense: true },
    ]);
    expect(answerProblemsFrom(error, sent)).toEqual([
      { fieldId: 'email', message: 'Enter an email address.' },
      { fieldId: 'full-name', message: 'Too long.' },
    ]);
  });

  it('finds nothing in errors that are not validation details', () => {
    expect(answerProblemsFrom(api(409), sent)).toEqual([]);
    expect(answerProblemsFrom(new Error('x'), sent)).toEqual([]);
  });
});

describe('screens for a refused action', () => {
  it('reads the reason the API gives before anything else', () => {
    expect(
      unavailablePhase(
        new ApiError(409, 'CONFLICT', 'Closed', { reason: 'limit-reached' }),
        'open',
      ),
    ).toBe('limit-reached');
    expect(
      unavailablePhase(new ApiError(409, 'CONFLICT', 'Nope', { reason: 'not-yet-open' }), 'open'),
    ).toBe('not-yet-open');
    expect(
      unavailablePhase(new ApiError(409, 'CONFLICT', 'Closed', { reason: 'drafts-off' }), 'open'),
    ).toBe('closed');
  });

  it('trusts the form’s schedule next, then the message', () => {
    expect(unavailablePhase(api(409, 'Whatever'), 'not-yet-open')).toBe('not-yet-open');
    expect(unavailablePhase(api(409, 'This form has reached its submission limit'), 'open')).toBe(
      'limit-reached',
    );
    expect(unavailablePhase(api(409, 'This form is not open yet'), 'open')).toBe('not-yet-open');
    expect(unavailablePhase(api(409, 'This form is closed'), 'open')).toBe('closed');
  });

  it('sends conflicts and missing forms to their screens and leaves the rest as messages', () => {
    expect(blockedPhaseFor(api(409, 'Closed'), 'open')).toBe('closed');
    expect(blockedPhaseFor(api(404))).toBe('not-found');
    expect(blockedPhaseFor(api(429))).toBeNull();
  });

  it('reads a refused preview token as an expired link', () => {
    expect(loadFailurePhase(api(401), true)).toBe('not-found');
    expect(loadFailurePhase(api(401), false)).toBe('error');
    expect(loadFailurePhase(api(404), false)).toBe('not-found');
  });
});

describe('uploadFailureMessage', () => {
  it('uses the API’s words for a refused file and plain words otherwise', () => {
    expect(uploadFailureMessage(api(400, 'This question does not accept .exe files'))).toBe(
      'This question does not accept .exe files',
    );
    expect(
      uploadFailureMessage(
        api(400, 'This question does not accept that kind of file', [
          { path: 'filename', message: 'Use one of these file types: pdf.' },
        ]),
      ),
    ).toBe('Use one of these file types: pdf.');
    expect(uploadFailureMessage(api(429))).toMatch(/Wait a few minutes/);
    expect(uploadFailureMessage(new TypeError('Failed to fetch'))).toMatch(/waking up/);
    expect(uploadFailureMessage(new Error('The upload was refused: too big'))).toBe(
      'The upload was refused: too big',
    );
  });
});
