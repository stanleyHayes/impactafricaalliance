import type { AnswerValue, FormField, FormFieldType } from '@iaa/shared';
import type { ComponentType } from 'react';

import type { AnswerUpdate } from '../session-state';

import { MultiSelectCards, RadioCards, SelectAnswer, usesNativeSelect } from './ChoiceAnswers';
import { fieldIdsFor, type FieldProps } from './field-props';
import { FileAnswerField } from './FileAnswerField';
import { QuestionFrame, type FrameKind } from './QuestionFrame';
import { LongTextAnswer, NumberAnswer, SingleLineAnswer } from './TextAnswers';
import { CheckboxAnswer, ConsentAnswer } from './TickAnswers';

/** The answer control for every question type. */
export const FIELD_RENDERERS: Record<FormFieldType, ComponentType<FieldProps>> = {
  'short-text': SingleLineAnswer,
  'long-text': LongTextAnswer,
  email: SingleLineAnswer,
  phone: SingleLineAnswer,
  number: NumberAnswer,
  date: SingleLineAnswer,
  select: SelectAnswer,
  'multi-select': MultiSelectCards,
  radio: RadioCards,
  checkbox: CheckboxAnswer,
  url: SingleLineAnswer,
  file: FileAnswerField,
  consent: ConsentAnswer,
};

const FRAME_KINDS: Record<FormFieldType, FrameKind> = {
  'short-text': 'label',
  'long-text': 'label',
  email: 'label',
  phone: 'label',
  number: 'label',
  date: 'label',
  select: 'legend',
  'multi-select': 'legend',
  radio: 'legend',
  checkbox: 'none',
  url: 'label',
  file: 'legend',
  consent: 'legend',
};

export const frameKindFor = (field: FormField): FrameKind =>
  usesNativeSelect(field) ? 'label' : FRAME_KINDS[field.type];

interface QuestionFieldProps {
  field: FormField;
  value: AnswerValue | undefined;
  error: string | undefined;
  onChange: (fieldId: string, update: AnswerUpdate) => void;
}

/** One question: its frame (label, help, error) around the control its type calls for. */
export const QuestionField = ({
  field,
  value,
  error,
  onChange,
}: QuestionFieldProps): JSX.Element => {
  const Renderer = FIELD_RENDERERS[field.type];
  const ids = fieldIdsFor(field, error);
  return (
    <QuestionFrame field={field} frame={frameKindFor(field)} ids={ids} error={error}>
      <Renderer
        field={field}
        value={value}
        error={error}
        ids={ids}
        onChange={(update) => onChange(field.id, update)}
      />
    </QuestionFrame>
  );
};
