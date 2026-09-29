import type { AnswerValue, FormField, FormOption } from '@iaa/shared';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { alpha, type Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

import { optionCardSx } from '../styles';

import { ENTER_ADVANCES, isRequiredField, type FieldProps } from './field-props';

/**
 * Past this many options a list of cards becomes a long scroll, so a select
 * question becomes a searchable list instead: type a few letters to narrow
 * it, or open it and pick.
 */
export const CARD_OPTION_LIMIT = 8;

export const usesSearchableSelect = (field: FormField): boolean =>
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

// The flow's large type and roomy input (see INPUT_SX). Autocomplete sets
// its own tighter padding with a more specific selector, so these name the
// same classes to win.
const SEARCH_INPUT_SX = {
  '& .MuiInputBase-input': { fontSize: { xs: '1.125rem', md: '1.25rem' }, lineHeight: 1.5 },
  '&.MuiAutocomplete-root .MuiOutlinedInput-root': { py: 0.75, pl: 1.25 },
  '&.MuiAutocomplete-root .MuiOutlinedInput-root .MuiAutocomplete-input': { py: 1, px: 0.75 },
} as const;

const listSx = (theme: Theme) => ({
  py: 0.75,
  maxHeight: 'min(22rem, 45vh)',
  '& .MuiAutocomplete-option': {
    minHeight: 48,
    mx: 0.75,
    px: 1.5,
    gap: 1.25,
    borderRadius: 2,
    fontSize: { xs: '1.0625rem', md: '1.125rem' },
    fontWeight: 500,
    lineHeight: 1.45,
    overflowWrap: 'anywhere',
  },
  '& .MuiAutocomplete-option[aria-selected="true"]': {
    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.1 : 0.14),
  },
  '& .MuiAutocomplete-option.Mui-focused, & .MuiAutocomplete-option[aria-selected="true"].Mui-focused':
    { bgcolor: alpha(theme.palette.primary.main, 0.18) },
});

const PAPER_SX = {
  mt: 0.75,
  borderRadius: 3,
  border: 1,
  borderColor: 'divider',
  fontSize: { xs: '1.0625rem', md: '1.125rem' },
} as const;

/**
 * A long list of options as a searchable list box, in the flow's own style
 * rather than the browser's dropdown. Typing narrows the list and highlights
 * the first match; arrow keys, Home and End move through it; Enter or a tap
 * chooses. Screen readers hear it as a combo box with the question as its
 * name.
 *
 * Enter moves on to the next step only while the list is shut. With the list
 * open, Enter chooses the highlighted option instead.
 */
const SearchableSelect = ({ field, value, error, ids, onChange }: FieldProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const selected = field.options.find((option) => option.value === value) ?? null;
  return (
    <Autocomplete<FormOption>
      id={ids.input}
      options={field.options}
      value={selected}
      onChange={(_event, option) => onChange(option?.value ?? '')}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, current) => option.value === current.value}
      autoHighlight
      blurOnSelect="touch"
      fullWidth
      noOptionsText="Nothing matches that. Try fewer letters, or open the list."
      clearText="Clear answer"
      openText="Show the options"
      closeText="Hide the options"
      sx={SEARCH_INPUT_SX}
      slotProps={{ paper: { sx: PAPER_SX }, listbox: { sx: listSx } }}
      renderOption={({ key, ...optionProps }, option, state) => (
        <li key={key} {...optionProps}>
          <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
            {option.label}
          </Box>
          {state.selected && (
            <CheckRoundedIcon aria-hidden="true" sx={{ color: 'primary.main', flexShrink: 0 }} />
          )}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={field.placeholder ?? 'Start typing, or open the list'}
          error={Boolean(error)}
          slotProps={{
            ...params.slotProps,
            htmlInput: {
              ...params.slotProps.htmlInput,
              'aria-describedby': ids.describedBy,
              'aria-invalid': Boolean(error) || undefined,
              'aria-required': isRequiredField(field) || undefined,
              ...(open ? {} : ENTER_ADVANCES),
            },
          }}
        />
      )}
    />
  );
};

/** A select question: cards for a short list, a searchable list for a long one. */
export const SelectAnswer = (props: FieldProps): JSX.Element =>
  usesSearchableSelect(props.field) ? <SearchableSelect {...props} /> : <RadioCards {...props} />;
