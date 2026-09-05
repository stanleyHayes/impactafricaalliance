/* eslint-disable react/display-name -- the values below are render helpers
   (field, rhf, error) => JSX, dispatched by field type, not React components. */
import type { EventQuestion, MediaAsset } from '@iaa/shared';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldValues,
} from 'react-hook-form';

import type { FieldConfig, FieldType } from '../../resources/types';
import { AiAssistButton } from '../ai/AiAssistButton';
import { MediaUploadField } from '../fields/MediaUploadField';
import { QuestionBuilder } from '../fields/QuestionBuilder';
import { TagsField } from '../fields/TagsField';
import { MarkdownEditor } from '../markdown/MarkdownEditor';

interface FieldRendererProps {
  field: FieldConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  onUploadingChange?: (fieldName: string, uploading: boolean) => void;
}

type Rhf = ControllerRenderProps<FieldValues, string>;
type Renderer = (
  field: FieldConfig,
  rhf: Rhf,
  error: string | undefined,
  onUploadingChange?: FieldRendererProps['onUploadingChange'],
) => JSX.Element;

const toLocalInput = (iso: unknown): string => {
  if (typeof iso !== 'string' || iso.length === 0) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
};

const switchRenderer: Renderer = (field, rhf) => (
  <FormControlLabel
    control={
      <Switch checked={Boolean(rhf.value)} onChange={(_e, checked) => rhf.onChange(checked)} />
    }
    label={field.label}
  />
);

const selectRenderer: Renderer = (field, rhf, error) => (
  <TextField
    select
    fullWidth
    label={field.label}
    value={rhf.value ?? ''}
    onChange={rhf.onChange}
    error={Boolean(error)}
    helperText={error}
  >
    {field.options?.map((option) => (
      <MenuItem key={option.value} value={option.value} sx={{ textTransform: 'capitalize' }}>
        {option.label}
      </MenuItem>
    ))}
  </TextField>
);

const numberRenderer: Renderer = (field, rhf, error) => (
  <TextField
    type="number"
    fullWidth
    label={field.label}
    value={rhf.value ?? ''}
    onChange={(e) => rhf.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
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

const datetimeRenderer: Renderer = (field, rhf, error) => (
  <TextField
    type="datetime-local"
    fullWidth
    label={field.label}
    slotProps={{ inputLabel: { shrink: true } }}
    value={toLocalInput(rhf.value)}
    onChange={(e) =>
      rhf.onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)
    }
    error={Boolean(error)}
    helperText={error}
  />
);

const mediaRenderer =
  (accept: string, preview: boolean): Renderer =>
  (field, rhf, error, onUploadingChange) => (
    <Box>
      <MediaUploadField
        label={field.label}
        accept={accept}
        preview={preview}
        value={rhf.value as MediaAsset | undefined}
        onChange={rhf.onChange}
        onUploadingChange={(uploading) => onUploadingChange?.(field.name, uploading)}
      />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );

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
  number: numberRenderer,
  tags: tagsRenderer,
  datetime: datetimeRenderer,
  image: mediaRenderer('image/*', true),
  file: mediaRenderer('application/pdf', false),
  text: textRenderer(undefined, true),
  slug: textRenderer(),
  textarea: textRenderer(3, true),
  richtext: markdownRenderer,
  questions: questionsRenderer,
};

/** Renders a single configured field bound to react-hook-form. */
export const FieldRenderer = ({
  field,
  control,
  onUploadingChange,
}: FieldRendererProps): JSX.Element => (
  <Controller
    name={field.name}
    control={control}
    render={({ field: rhf, fieldState }) =>
      RENDERERS[field.type](field, rhf, fieldState.error?.message, onUploadingChange)
    }
  />
);
