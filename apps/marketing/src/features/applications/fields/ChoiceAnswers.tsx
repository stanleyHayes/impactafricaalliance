import type { AnswerValue, FormField } from '@iaa/shared';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';

import { INPUT_SX, optionCardSx } from '../styles';

import { isRequiredField, type FieldProps } from './field-props';

/**
 * Past this many options a list of cards becomes a long scroll, so a select
 * question falls back to the browser's own dropdown, which every phone
 * presents as a comfortable picker.
 */
export const CARD_OPTION_LIMIT = 8;

export const usesNativeSelect = (field: FormField): boolean =>
  field.type === 'select' && field.options.length > CARD_OPTION_LIMIT;

const chosenValues = (value: AnswerValue | undefined): string[] =>
  Array.isArray(value)
    ? (value as unknown[]).filter((item): item is string => typeof item === 'string')
    : [];

/** One choice, as a column of large option cards. Arrow keys move between them. */
export const RadioCards = ({ field, value, error, ids, onChange }: FieldProps): JSX.Element => {
  const selected = typeof value === 'string' ? value : '';
  return (
    <RadioGroup
      name={ids.input}
      value={selected}
      onChange={(_event, next) => onChange(next)}
      aria-labelledby={ids.label}
      aria-describedby={ids.describedBy}
      aria-invalid={Boolean(error) || undefined}
      aria-required={isRequiredField(field) || undefined}
      sx={{ gap: 1.25 }}
    >
      {field.options.map((option, index) => (
        <FormControlLabel
          key={option.value}
          value={option.value}
          control={<Radio id={index === 0 ? ids.input : undefined} />}
          label={option.label}
          sx={optionCardSx(selected === option.value, Boolean(error))}
        />
      ))}
    </RadioGroup>
  );
};

/**
 * Several choices, as option cards with tick-boxes. The answer keeps the
 * form's own option order, whatever order they were ticked in, so the review
 * screen reads the way the question did.
 */
export const MultiSelectCards = ({
  field,
  value,
  error,
  ids,
  onChange,
}: FieldProps): JSX.Element => {
  const chosen = chosenValues(value);
  const toggle = (optionValue: string, checked: boolean): void =>
    onChange((previous) => {
      const next = new Set(chosenValues(previous));
      if (checked) {
        next.add(optionValue);
      } else {
        next.delete(optionValue);
      }
      return field.options.map((option) => option.value).filter((item) => next.has(item));
    });
  return (
    <Box sx={{ display: 'grid', gap: 1.25 }}>
      {field.options.map((option, index) => {
        const checked = chosen.includes(option.value);
        return (
          <FormControlLabel
            key={option.value}
            control={
              <Checkbox
                id={index === 0 ? ids.input : undefined}
                checked={checked}
                onChange={(_event, isChecked) => toggle(option.value, isChecked)}
              />
            }
            label={option.label}
            sx={optionCardSx(checked, Boolean(error))}
          />
        );
      })}
    </Box>
  );
};

/** A long list of options in the browser's own picker. */
const NativeSelect = ({ field, value, error, ids, onChange }: FieldProps): JSX.Element => (
  <TextField
    select
    fullWidth
    value={typeof value === 'string' ? value : ''}
    onChange={(event) => onChange(event.target.value)}
    error={Boolean(error)}
    sx={INPUT_SX}
    slotProps={{
      select: { native: true },
      htmlInput: {
        id: ids.input,
        required: isRequiredField(field),
        'aria-describedby': ids.describedBy,
        'aria-invalid': Boolean(error) || undefined,
      },
    }}
  >
    <option value="">{field.placeholder ?? 'Choose one'}</option>
    {field.options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </TextField>
);

/** A select question: cards for a short list, the browser's picker for a long one. */
export const SelectAnswer = (props: FieldProps): JSX.Element =>
  usesNativeSelect(props.field) ? <NativeSelect {...props} /> : <RadioCards {...props} />;
