import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import type { SxProps, Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useReducedMotion } from 'framer-motion';
import { useState, type ReactNode, type Ref } from 'react';

import {
  MONTH_NAMES,
  partsFromValue,
  valueFromParts,
  type DateParts,
} from '../../lib/calendar-date';

export interface DateFieldProps {
  /** The day input's id: the part that takes focus when someone is sent to the question. */
  id: string;
  /** `YYYY-MM-DD`, `''` when empty, or the unfinished form this field writes while typing. */
  value: string;
  onChange: (value: string) => void;
  /**
   * Names the three parts as one group. Leave it out when a fieldset legend
   * around the field already does, so the name is not read twice.
   */
  labelledBy?: string;
  /** Help and error ids for the group, read with its name. Only used with `labelledBy`. */
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
  /** Offers "Clear date" once anything is entered. For dates that may be left empty. */
  clearable?: boolean;
  /** Extra attributes for the day and year inputs, such as the applicant flow's Enter mark. */
  textInputProps?: Readonly<Record<string, string>>;
  /** Styles for each part, so the field matches the text fields around it. */
  inputSx?: SxProps<Theme>;
  variant?: 'outlined' | 'standard';
  /** The day input, for callers that move focus to the question themselves. */
  dayRef?: Ref<HTMLInputElement>;
}

const PART_LABEL_SX = {
  display: 'block',
  mb: 0.75,
  color: 'text.primary',
  fontSize: '1rem',
  fontWeight: 600,
  lineHeight: 1.4,
} as const;

const MENU_PAPER_SX = {
  mt: 0.75,
  maxHeight: 340,
  borderRadius: 3,
  border: 1,
  borderColor: 'divider',
  '& .MuiList-root': { py: 0.75 },
} as const;

const MENU_ITEM_SX = {
  minHeight: 48,
  mx: 0.75,
  px: 1.5,
  borderRadius: 2,
  fontSize: { xs: '1.0625rem', md: '1.125rem' },
  fontWeight: 500,
} as const;

/**
 * The month's shown value is a div, not an input, so it does not centre its
 * text as the day and year inputs do: it keeps the field's small inherited
 * line height and sits high once a caller enlarges the type (the event
 * registration dialog's big answers). A line as tall as the inputs keeps all
 * three on one baseline. It comes first, so a caller's own line height wins.
 */
const MONTH_VALUE_SX = { '& .MuiSelect-select': { lineHeight: '1.4375em' } } as const;

/** The month's own line height, then the caller's styles for every part. */
const monthSx = (inputSx: SxProps<Theme> | undefined): SxProps<Theme> => [
  MONTH_VALUE_SX,
  ...(Array.isArray(inputSx) ? inputSx : [inputSx]),
];

/** Only digits, and no more of them than the part holds. */
const digits = (text: string, length: number): string => text.replace(/\D/g, '').slice(0, length);

/**
 * The parts on screen, kept here so a half-typed date ("3" in the day box)
 * is shown exactly as typed. They are read again from `value` only when the
 * value changes from outside, such as a saved draft loading or the form
 * being reset.
 */
const useDateParts = (value: string, onChange: (value: string) => void) => {
  const [held, setHeld] = useState(() => ({ parts: partsFromValue(value), value }));
  let { parts } = held;
  if (held.value !== value) {
    parts = partsFromValue(value);
    setHeld({ parts, value });
  }
  const update = (patch: Partial<DateParts>): void => {
    const next = { ...parts, ...patch };
    const nextValue = valueFromParts(next);
    setHeld({ parts: next, value: nextValue });
    onChange(nextValue);
  };
  return { parts, update };
};

interface PartProps {
  label: string;
  /** For a real input, the id its `<label>` points at. */
  htmlFor?: string;
  /** For the month list, which a `<label>` cannot name, the id of the text naming it. */
  labelId?: string;
  sx: SxProps<Theme>;
  children: ReactNode;
}

const Part = ({ label, htmlFor, labelId, sx, children }: PartProps): JSX.Element => (
  <Box sx={sx}>
    <Typography
      component={htmlFor ? 'label' : 'span'}
      id={labelId}
      htmlFor={htmlFor}
      sx={PART_LABEL_SX}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

/**
 * A date as three labelled parts: Day, Month (by name) and Year.
 *
 * It replaces the browser's date input, whose calendar pop-up differs in
 * every browser, cannot take the site's look, and on some phones hides how
 * to type a year decades back. Typing a day and a year and choosing a month
 * by name works the same everywhere, reads clearly to screen readers, and
 * needs no date-picker library.
 *
 * The month is chosen from the site's own menu (a listbox that arrow keys,
 * Enter and first letters all work in), never the browser's `<select>`. The
 * value is stored as `YYYY-MM-DD` once all three parts make a real day; use
 * `calendarDateProblem` to say what is wrong before that.
 *
 * On narrow phones the year wraps under the day and month rather than
 * squeezing the month name, so nothing is cut off at 320 px.
 */
export const DateField = ({
  id,
  value,
  onChange,
  labelledBy,
  describedBy,
  invalid = false,
  required = false,
  clearable = false,
  textInputProps,
  inputSx,
  variant = 'outlined',
  dayRef,
}: DateFieldProps): JSX.Element => {
  const reduceMotion = useReducedMotion();
  const { parts, update } = useDateParts(value, onChange);
  const monthId = `${id}-month`;
  const monthLabelId = `${monthId}-label`;
  const yearId = `${id}-year`;
  const anyEntered = parts.day !== '' || parts.month !== '' || parts.year !== '';
  const partAria = {
    'aria-invalid': invalid || undefined,
    'aria-required': required || undefined,
  };

  const clear = (): void => {
    update({ day: '', month: '', year: '' });
    // The button disappears once the date is empty, so focus goes back to
    // the start of the date rather than being lost.
    document.getElementById(id)?.focus();
  };

  return (
    <Box
      role={labelledBy ? 'group' : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={labelledBy ? describedBy : undefined}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, maxWidth: '34rem' }}>
        <Part label="Day" htmlFor={id} sx={{ flex: '0 0 5.5rem' }}>
          <TextField
            fullWidth
            variant={variant}
            inputRef={dayRef}
            value={parts.day}
            onChange={(event) => update({ day: digits(event.target.value, 2) })}
            error={invalid}
            autoComplete="off"
            sx={inputSx}
            slotProps={{
              htmlInput: { id, inputMode: 'numeric', ...partAria, ...textInputProps },
            }}
          />
        </Part>
        <Part label="Month" labelId={monthLabelId} sx={{ flex: '1 1 11rem', minWidth: 0 }}>
          <TextField
            select
            fullWidth
            variant={variant}
            value={parts.month}
            onChange={(event) => update({ month: event.target.value })}
            error={invalid}
            sx={monthSx(inputSx)}
            slotProps={{
              select: {
                displayEmpty: true,
                labelId: monthLabelId,
                SelectDisplayProps: { id: monthId, ...partAria },
                renderValue: (selected) =>
                  selected === '' ? (
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      Choose
                    </Box>
                  ) : (
                    MONTH_NAMES[Number(selected) - 1]
                  ),
                MenuProps: {
                  transitionDuration: reduceMotion ? 0 : 'auto',
                  slotProps: { paper: { sx: MENU_PAPER_SX } },
                },
              },
            }}
          >
            {MONTH_NAMES.map((name, index) => (
              <MenuItem key={name} value={String(index + 1)} sx={MENU_ITEM_SX}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        </Part>
        <Part label="Year" htmlFor={yearId} sx={{ flex: '0 0 7.5rem' }}>
          <TextField
            fullWidth
            variant={variant}
            value={parts.year}
            onChange={(event) => update({ year: digits(event.target.value, 4) })}
            error={invalid}
            autoComplete="off"
            sx={inputSx}
            slotProps={{
              htmlInput: { id: yearId, inputMode: 'numeric', ...partAria, ...textInputProps },
            }}
          />
        </Part>
      </Box>
      {clearable && anyEntered && (
        <Button
          type="button"
          variant="text"
          onClick={clear}
          sx={{ mt: 1, ml: -1.5, color: 'text.primary', fontWeight: 700 }}
        >
          Clear date
        </Button>
      )}
    </Box>
  );
};
