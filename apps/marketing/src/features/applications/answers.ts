import {
  acceptedFormatsFor,
  answerFor,
  isEmptyAnswer,
  maxFileBytesFor,
  maxFilesFor,
  pruneHiddenAnswers,
  validateAnswer,
  validateAnswers,
  type AnswerMap,
  type AnswerProblem,
  type AnswerValue,
  type FileAnswer,
  type FormAnswer,
  type FormField,
  type FormStep,
} from '@iaa/shared';

import { calendarDateProblem, formatDateKey } from '../../lib/calendar-date';
import { formatEventTime } from '../../lib/event-utils';

import type { ServerAnswerProblem } from './errors';

/**
 * Plain helpers over answers: what to save, what is wrong, and how to show
 * an answer back to the person who gave it. Every rule about validity comes
 * from `@iaa/shared`, so the browser and the API agree (plan D15).
 */

/** Whether two answers are the same, so an unchanged value never counts as an edit. */
export const sameAnswer = (a: AnswerValue | undefined, b: AnswerValue | undefined): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Every question in the form by id. */
export const fieldsById = (steps: readonly FormStep[]): Map<string, FormField> =>
  new Map(steps.flatMap((step) => step.fields.map((field) => [field.id, field] as const)));

/**
 * What an autosave sends: the visible answers, minus any that draft-mode
 * checks would refuse (an over-long answer, say). The API replaces the stored
 * set with this one, and one unsavable answer must not stop the rest from
 * saving; the person is told about it when they press Continue.
 */
export const savableAnswers = (steps: readonly FormStep[], answers: AnswerMap): FormAnswer[] => {
  const fields = fieldsById(steps);
  return pruneHiddenAnswers(steps, answers).filter((answer) => {
    const field = fields.get(answer.fieldId);
    return field !== undefined && validateAnswer(field, answer.value, 'draft') === null;
  });
};

/**
 * Every problem with the answers, checked as strictly as a submission.
 *
 * The shared check can only say "Enter a date." about a date it cannot read.
 * The Day / Month / Year field keeps what was typed, so here the person is
 * told which part is missing, or that the day does not exist ("February 2027
 * has 28 days"), as the browser's date input never did.
 */
export const submitProblems = (steps: readonly FormStep[], answers: AnswerMap): AnswerProblem[] => {
  const fields = fieldsById(steps);
  return validateAnswers(steps, answers, { mode: 'submit' }).map((problem) => {
    const value = answerFor(answers, problem.fieldId);
    if (fields.get(problem.fieldId)?.type !== 'date' || typeof value !== 'string') {
      return problem;
    }
    return { ...problem, message: calendarDateProblem(value) ?? problem.message };
  });
};

/** Problems on one step, checked as strictly as a submission. */
export const stepProblems = (
  steps: readonly FormStep[],
  answers: AnswerMap,
  stepId: string,
): AnswerProblem[] => submitProblems(steps, answers).filter((problem) => problem.stepId === stepId);

/** The first step with problems, its errors by question, and the question to focus. */
export interface StepErrors {
  stepId: string;
  errors: Record<string, string>;
  focusFieldId: string;
}

export const firstStepErrors = (problems: readonly AnswerProblem[]): StepErrors | null => {
  const first = problems[0];
  if (!first) {
    return null;
  }
  const errors = Object.fromEntries(
    problems
      .filter((problem) => problem.stepId === first.stepId)
      .map((problem) => [problem.fieldId, problem.message]),
  );
  return { stepId: first.stepId, errors, focusFieldId: first.fieldId };
};

/**
 * Server problems placed on the steps the person can see, in form order. A
 * problem with a question they cannot see has nowhere to be fixed, so it is
 * left for the general message.
 */
export const locateProblems = (
  problems: readonly ServerAnswerProblem[],
  steps: readonly FormStep[],
): AnswerProblem[] => {
  const byField = new Map(problems.map((problem) => [problem.fieldId, problem.message]));
  return steps.flatMap((step) =>
    step.fields.flatMap((field) => {
      const message = byField.get(field.id);
      return message === undefined ? [] : [{ fieldId: field.id, stepId: step.id, message }];
    }),
  );
};

/** Whether the person has answered anything at all. */
export const hasAnyAnswer = (answers: AnswerMap): boolean =>
  Object.values(answers).some((value) => !isEmptyAnswer(value));

/** `2026-10-05` as "5 October 2026", read as a calendar day with no time zone. */
export const formatCalendarDate = formatDateKey;

const instantDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

/**
 * An instant on the house clock, such as "6 November 2026 at 12:00 PM GMT".
 * Opening and closing times are deadlines read in both Ghana (GMT) and
 * Nigeria (WAT), so they follow the events pages: a 12-hour time labelled
 * GMT, never an unlabelled local time. The day is taken in UTC as well, so it
 * always agrees with the time beside it.
 */
export const formatInstant = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${instantDateFormatter.format(date)} at ${formatEventTime(iso)} GMT`;
};

/** A file size a person can read: "820 KB", "2.4 MB". */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  const megabytes = bytes / (1024 * 1024);
  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
};

/** What a file question accepts, stated before anyone picks a file. */
export const fileRulesText = (field: FormField): string => {
  const formats = acceptedFormatsFor(field).map((format) => format.toUpperCase());
  const megabytes = maxFileBytesFor(field) / (1024 * 1024);
  const count = maxFilesFor(field);
  const files =
    count === 1 ? `One file, up to ${megabytes} MB` : `Up to ${count} files, ${megabytes} MB each`;
  return `${files}. Accepted types: ${formats.join(', ')}.`;
};

/** An answer as the review screen shows it: nothing, one line, or a list. */
export type AnswerSummary =
  { kind: 'empty' } | { kind: 'text'; text: string } | { kind: 'list'; items: string[] };

const optionLabel = (field: FormField, value: string): string =>
  field.options.find((option) => option.value === value)?.label ?? value;

const isFileList = (value: AnswerValue): value is FileAnswer[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null);

const listSummary = (field: FormField, value: unknown[]): AnswerSummary => {
  if (isFileList(value as AnswerValue)) {
    return { kind: 'list', items: (value as FileAnswer[]).map((file) => file.name) };
  }
  return { kind: 'list', items: (value as string[]).map((item) => optionLabel(field, item)) };
};

const textSummary = (field: FormField, value: string): AnswerSummary => {
  if (field.type === 'date') {
    return { kind: 'text', text: formatCalendarDate(value) };
  }
  if (field.type === 'select' || field.type === 'radio') {
    return { kind: 'text', text: optionLabel(field, value) };
  }
  return { kind: 'text', text: value.trim() };
};

export const summariseAnswer = (field: FormField, answers: AnswerMap): AnswerSummary => {
  const value = answerFor(answers, field.id);
  // Leaving a tick-box empty is itself an answer ("no"), so it never reads as
  // a question the person skipped.
  if (field.type === 'checkbox') {
    return { kind: 'text', text: value === true ? 'Yes' : 'No' };
  }
  if (value === undefined || isEmptyAnswer(value)) {
    return { kind: 'empty' };
  }
  if (Array.isArray(value)) {
    return listSummary(field, value);
  }
  if (typeof value === 'boolean') {
    return { kind: 'text', text: field.type === 'consent' ? 'Agreed' : 'Yes' };
  }
  if (typeof value === 'number') {
    return { kind: 'text', text: value.toLocaleString('en-GB') };
  }
  return textSummary(field, String(value));
};
