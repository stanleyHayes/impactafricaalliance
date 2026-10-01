/* eslint-disable react/display-name -- the values below are render helpers
   (field, rhf, error) => JSX, dispatched by field type, not React components. */
import type { EventQuestion, MediaAsset } from '@iaa/shared';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldError,
  type FieldValues,
} from 'react-hook-form';

import type { FieldConfig, FieldType } from '../../resources/types';
import { AiAssistButton } from '../ai/AiAssistButton';
import { ChoiceCards } from '../fields/ChoiceCards';
import { IsoDateTimeField } from '../fields/EventDateTimeField';
import { MediaUploadField } from '../fields/MediaUploadField';
import { OptionSelect } from '../fields/OptionSelect';
import { QuestionBuilder } from '../fields/QuestionBuilder';
import { TagsField } from '../fields/TagsField';
import { MarkdownEditor } from '../markdown/MarkdownEditor';

/** What a field tells its form beyond its value. */
interface FieldReports {
  onUploadingChange?: (fieldName: string, uploading: boolean) => void;
  /**
   * What a date field objects to while it holds a half-typed date, or null
   * once it holds a whole one. The form must not continue or save meanwhile.
   */
  onProblemChange?: (fieldName: string, problem: string | null) => void;
}

interface FieldRendererProps extends FieldReports {
  field: FieldConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
}

type Rhf = ControllerRenderProps<FieldValues, string>;
type Renderer = (
  field: FieldConfig,
  rhf: Rhf,
  error: string | undefined,
  reports: FieldReports,
) => JSX.Element;

const switchRenderer: Renderer = (field, rhf) => (
  <FormControlLabel
    control={
      <Switch checked={Boolean(rhf.value)} onChange={(_e, checked) => rhf.onChange(checked)} />
    }
    label={field.label}
  />
);

const selectRenderer: Renderer = (field, rhf, error) => (
  <OptionSelect
    label={field.label}
    options={field.options ?? []}
    value={typeof rhf.value === 'string' ? rhf.value : ''}
    onChange={rhf.onChange}
    error={error}
    helperText={field.helperText}
  />
);

const choiceRenderer: Renderer = (field, rhf, error) => (
  <ChoiceCards
    label={field.label}
    options={field.options ?? []}
    value={typeof rhf.value === 'string' ? rhf.value : ''}
    onChange={rhf.onChange}
    error={error}
    helperText={field.helperText}
  />
);

/**
 * An emptied number is null, never undefined: react-hook-form shows a
 * field's default in place of undefined, which on an edit page is the stored
 * value, so the field snapped back to it. resourceResolver reads the null as
 * "no value".
 */
const numberRenderer: Renderer = (field, rhf, error) => (
  <TextField
    type="number"
    fullWidth
    label={field.label}
    value={rhf.value ?? ''}
    onChange={(e) => rhf.onChange(e.target.value === '' ? null : Number(e.target.value))}
    error={Boolean(error)}
    helperText={error}
  />
);

const tagsRenderer: Renderer = (field, rhf, error) => (
  <TagsField
    label={field.label}
    value={(rhf.value ?? []) as string[]}
    onChange={rhf.onChange}
    error={error}
    helperText={field.helperText}
  />
);

const datetimeRenderer: Renderer = (field, rhf, error, { onProblemChange }) => (
  <IsoDateTimeField
    label={field.label}
    value={typeof rhf.value === 'string' ? rhf.value : null}
    onChange={rhf.onChange}
    onProblemChange={(problem) => onProblemChange?.(field.name, problem)}
    error={error}
    helperText={field.helperText}
  />
);

/** An error when there is one, otherwise the field's own guidance. */
const MediaHelp = ({ field, error }: { field: FieldConfig; error?: string }): JSX.Element | null =>
  error || field.helperText ? (
    <FormHelperText error={Boolean(error)}>{error ?? field.helperText}</FormHelperText>
  ) : null;

/** A removed file is null, like an emptied number, so the stored one does not come back. */
const mediaRenderer =
  (accept: string, preview: boolean): Renderer =>
  (field, rhf, error, { onUploadingChange }) => (
    <Box>
      <MediaUploadField
        label={field.label}
        accept={accept}
        preview={preview}
        value={(rhf.value as MediaAsset | null | undefined) ?? undefined}
        onChange={(asset) => rhf.onChange(asset ?? null)}
        onUploadingChange={(uploading) => onUploadingChange?.(field.name, uploading)}
      />
      <MediaHelp field={field} error={error} />
    </Box>
  );

/**
 * The upload control for a field that stores only an address. The address
 * doubles as the asset's id, which is all the control needs to show it; an
 * emptied field saves an empty string, which the API reads as "no picture".
 */
const imageUrlRenderer: Renderer = (field, rhf, error, { onUploadingChange }) => {
  const url = typeof rhf.value === 'string' && rhf.value ? rhf.value : undefined;
  return (
    <Box>
      <MediaUploadField
        label={field.label}
        accept="image/*"
        preview
        value={url ? { url, publicId: url } : undefined}
        onChange={(asset) => rhf.onChange(asset?.url ?? '')}
        onUploadingChange={(uploading) => onUploadingChange?.(field.name, uploading)}
      />
      <MediaHelp field={field} error={error} />
    </Box>
  );
};

const textRenderer =
  (minRows?: number, ai = false): Renderer =>
  (field, rhf, error) => (
    <TextField
      fullWidth
      label={field.label}
      value={rhf.value ?? ''}
      onChange={rhf.onChange}
      multiline={minRows !== undefined}
      minRows={minRows}
      error={Boolean(error)}
      helperText={error ?? field.helperText}
      slotProps={
        ai
          ? {
              input: {
                endAdornment: (
                  <InputAdornment
                    position="end"
                    sx={{
                      alignSelf: minRows !== undefined ? 'flex-end' : 'center',
                      mb: minRows !== undefined ? 0.75 : 0,
                    }}
                  >
                    <AiAssistButton
                      value={typeof rhf.value === 'string' ? rhf.value : ''}
                      onChange={rhf.onChange}
                    />
                  </InputAdornment>
                ),
              },
            }
          : undefined
      }
    />
  );

const markdownRenderer: Renderer = (field, rhf, error) => (
  <MarkdownEditor
    label={field.label}
    value={typeof rhf.value === 'string' ? rhf.value : ''}
    onChange={rhf.onChange}
    error={error ?? field.helperText}
  />
);

const questionsRenderer: Renderer = (field, rhf) => (
  <QuestionBuilder
    label={field.label}
    helperText={field.helperText}
    value={(rhf.value ?? []) as EventQuestion[]}
    onChange={rhf.onChange}
  />
);

const RENDERERS: Record<FieldType, Renderer> = {
  switch: switchRenderer,
  select: selectRenderer,
  choice: choiceRenderer,
  number: numberRenderer,
  tags: tagsRenderer,
  datetime: datetimeRenderer,
  image: mediaRenderer('image/*', true),
  imageUrl: imageUrlRenderer,
  file: mediaRenderer('application/pdf', false),
  text: textRenderer(undefined, true),
  slug: textRenderer(),
  textarea: textRenderer(3, true),
  richtext: markdownRenderer,
  questions: questionsRenderer,
};

/** Nothing given: no value, empty text or an empty list. */
const isEmptyValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

/**
 * What a field left empty asks for, when it must not be. "Choose" covers
 * uploading and the media library alike, whichever this person may use.
 */
const MISSING: Partial<Record<FieldType, string>> = {
  select: 'Choose one of the options.',
  choice: 'Choose one of the options.',
  number: 'Enter a number.',
  datetime: 'Choose a date and time.',
  tags: 'Add at least one tag.',
  image: 'Choose a picture.',
  imageUrl: 'Choose a picture.',
  file: 'Choose a PDF.',
};

/** "Name (for this list only)" as "name"; "SEO title" keeps its capitals. */
const nounOf = (label: string): string => {
  const noun = label.replace(/\s*\(.*\)\s*$/, '');
  return /^[A-Z]{2}/.test(noun) ? noun : noun.charAt(0).toLowerCase() + noun.slice(1);
};

/**
 * A field that must be filled and was left empty says what to do ("Choose a
 * pillar.", "Enter the title.") rather than the schema's words for it
 * ("Invalid input: expected string, received undefined", "Too small:
 * expected string to have >=3 characters"). A resource's own rule keeps its
 * message, as does a value that is there but wrong.
 */
const plainError = (field: FieldConfig, value: unknown, error?: FieldError): string | undefined => {
  if (!error) return undefined;
  if (error.type === 'custom' || !isEmptyValue(value)) return error.message;
  return field.missing ?? MISSING[field.type] ?? `Enter the ${nounOf(field.label)}.`;
};

/** Renders a single configured field bound to react-hook-form. */
export const FieldRenderer = ({
  field,
  control,
  onUploadingChange,
  onProblemChange,
}: FieldRendererProps): JSX.Element => (
  <Controller
    name={field.name}
    control={control}
    render={({ field: rhf, fieldState }) =>
      RENDERERS[field.type](field, rhf, plainError(field, rhf.value, fieldState.error), {
        onUploadingChange,
        onProblemChange,
      })
    }
  />
);
