import type { ApplicantMapping, FormFieldType } from '@iaa/shared';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { HTMLAttributes } from 'react';

import { INPUT_SX } from '../styles';

import { ENTER_ADVANCES, isRequiredField, joinIds, type FieldProps } from './field-props';

interface SingleLineConfig {
  type: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
}

// Each single-line type gets the keyboard that suits it on a phone.
const SINGLE_LINE: Partial<Record<FormFieldType, SingleLineConfig>> = {
  'short-text': { type: 'text' },
  email: { type: 'email', inputMode: 'email', autoComplete: 'email' },
  phone: { type: 'tel', inputMode: 'tel', autoComplete: 'tel' },
  url: { type: 'url', inputMode: 'url', autoComplete: 'url' },
  date: { type: 'date' },
};

// A question that supplies the applicant's own details can be filled in by
// the browser.
const MAPPED_AUTOCOMPLETE: Record<ApplicantMapping, string> = {
  'applicant-name': 'name',
  'applicant-email': 'email',
  'applicant-phone': 'tel',
};

const autoCompleteFor = (props: FieldProps, config: SingleLineConfig): string | undefined =>
  props.field.mapsTo ? MAPPED_AUTOCOMPLETE[props.field.mapsTo] : config.autoComplete;

/**
 * Short text, email, phone, link and date: one line each, and Enter moves on.
 * A date uses the browser's own date input, which stores `YYYY-MM-DD`.
 */
export const SingleLineAnswer = (props: FieldProps): JSX.Element => {
  const { field, value, error, ids, onChange } = props;
  const config = SINGLE_LINE[field.type] ?? { type: 'text' };
  return (
    <TextField
      fullWidth
      type={config.type}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      error={Boolean(error)}
      autoComplete={autoCompleteFor(props, config)}
      sx={INPUT_SX}
      slotProps={{
        htmlInput: {
          id: ids.input,
          inputMode: config.inputMode,
          required: isRequiredField(field),
          'aria-describedby': ids.describedBy,
          'aria-invalid': Boolean(error) || undefined,
          ...ENTER_ADVANCES,
        },
      }}
    />
  );
};

/**
 * A number. Stored as a number, or null when cleared. The browser's number
 * input reports half-typed values such as "-" as empty; React leaves what is
 * on screen alone in that case, so typing is never interrupted.
 *
 * The value is handed over as a number, not a string, on purpose: React
 * compares a number input's text with a number numerically, so "1.0" on the
 * way to "1.05" is left alone. Compared with the string "1" it would be
 * rewritten mid-typing and the decimal could never be entered.
 */
export const NumberAnswer = ({ field, value, error, ids, onChange }: FieldProps): JSX.Element => (
  <TextField
    fullWidth
    type="number"
    value={typeof value === 'number' ? value : ''}
    onChange={(event) => {
      const raw = event.target.value;
      const parsed = Number(raw);
      onChange(raw === '' || !Number.isFinite(parsed) ? null : parsed);
    }}
    placeholder={field.placeholder}
    error={Boolean(error)}
    sx={INPUT_SX}
    slotProps={{
      htmlInput: {
        id: ids.input,
        inputMode: 'decimal',
        min: field.validation?.min,
        max: field.validation?.max,
        required: isRequiredField(field),
        'aria-describedby': ids.describedBy,
        'aria-invalid': Boolean(error) || undefined,
        ...ENTER_ADVANCES,
      },
    }}
  />
);

/**
 * Long text. Enter makes a new line here, never a step change. When the
 * question sets a limit, a running count shows how much room is left; the
 * count follows the trimmed text, as the check does.
 */
export const LongTextAnswer = ({ field, value, error, ids, onChange }: FieldProps): JSX.Element => {
  const text = typeof value === 'string' ? value : '';
  const max = field.validation?.maxLength;
  const counterId = `${ids.input}-count`;
  const length = text.trim().length;
  return (
    <>
      <TextField
        fullWidth
        multiline
        minRows={5}
        maxRows={16}
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        error={Boolean(error)}
        sx={INPUT_SX}
        slotProps={{
          htmlInput: {
            id: ids.input,
            required: isRequiredField(field),
            'aria-describedby': joinIds(ids.describedBy, max !== undefined && counterId),
            'aria-invalid': Boolean(error) || undefined,
          },
        }}
      />
      {max !== undefined && (
        <Typography
          id={counterId}
          variant="body2"
          sx={{
            mt: 0.75,
            textAlign: 'right',
            color: length > max ? 'error.main' : 'text.secondary',
            fontWeight: length > max ? 700 : 400,
          }}
        >
          {length.toLocaleString('en-GB')} of {max.toLocaleString('en-GB')} characters
        </Typography>
      )}
    </>
  );
};
