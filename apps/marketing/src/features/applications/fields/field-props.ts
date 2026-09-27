import type { AnswerValue, FormField } from '@iaa/shared';

import type { AnswerUpdate } from '../session-state';

/** The element ids one question uses, so labels, help and errors can point at each other. */
export interface FieldIds {
  /** The element that takes focus: the input, the first option, or the upload button. */
  input: string;
  label: string;
  help: string;
  error: string;
  /** Help and error ids for `aria-describedby`, or undefined when there are none. */
  describedBy: string | undefined;
}

/** Props every question renderer takes, whatever its type. */
export interface FieldProps {
  field: FormField;
  value: AnswerValue | undefined;
  error: string | undefined;
  ids: FieldIds;
  onChange: (update: AnswerUpdate) => void;
}

/** The id of the element to focus for a question, used to send people to a problem. */
export const fieldInputId = (fieldId: string): string => `field-${fieldId}`;

export const fieldIdsFor = (field: FormField, error: string | undefined): FieldIds => {
  const input = fieldInputId(field.id);
  const help = `${input}-help`;
  const errorId = `${input}-error`;
  const describedBy = [field.helpText ? help : null, error ? errorId : null]
    .filter((id): id is string => id !== null)
    .join(' ');
  return {
    input,
    label: `${input}-label`,
    help,
    error: errorId,
    describedBy: describedBy || undefined,
  };
};

/** Ids joined for `aria-describedby`, skipping the missing ones. */
export const joinIds = (...ids: (string | undefined | null | false)[]): string | undefined =>
  ids.filter((id): id is string => typeof id === 'string' && id !== '').join(' ') || undefined;

/** A consent question always needs agreeing to, whether or not it is marked required. */
export const isRequiredField = (field: FormField): boolean =>
  field.required || field.type === 'consent';

/**
 * Marks a single-line input whose Enter key moves to the next step. Read by
 * the step's key handler; textareas, lists and buttons never carry it.
 */
export const ENTER_ADVANCES = { 'data-enter-advances': 'true' } as const;
