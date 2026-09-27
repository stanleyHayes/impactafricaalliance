import { calendarDateKey, isCalendarDateKey, toCalendarDateIso } from '@iaa/shared';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import Box from '@mui/material/Box';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { DateValidationError } from '@mui/x-date-pickers/models';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface DateFieldProps {
  label: string;
  /**
   * The stored date: an ISO datetime at noon UTC (`toCalendarDateIso`), or
   * null when there is none. A bare `YYYY-MM-DD` is read too.
   */
  value: string | null | undefined;
  /**
   * Called with the new noon-UTC ISO string, or null when the reader clears
   * the field. Null rather than undefined, because JSON drops undefined and a
   * PATCH would then keep the old date.
   */
  onChange: (value: string | null) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  /** Earliest day that can be picked, in the same form as `value`. */
  minDate?: string | null;
  /** Latest day that can be picked, in the same form as `value`. */
  maxDate?: string | null;
}

/**
 * The stored date as a local midnight Dayjs, which is what the picker shows.
 *
 * Read through the calendar-day key rather than parsed as an instant: noon
 * UTC is already the next morning in Auckland in summer, and a due date has to
 * read the same for everyone.
 */
const toPickerValue = (value: string | null | undefined): Dayjs | null => {
  if (!value) return null;
  try {
    return dayjs(calendarDateKey(value));
  } catch {
    // A stored value that is not a real date shows as empty rather than
    // breaking the page.
    return null;
  }
};

const INCOMPLETE = 'Finish typing the date, or clear the field.';

/** What the picker's own checks mean, in words. Null when there is nothing to say. */
const pickerProblem = (problem: DateValidationError | null): string | null => {
  switch (problem) {
    case null:
      return null;
    case 'minDate':
      return 'Pick a later day.';
    case 'maxDate':
      return 'Pick an earlier day.';
    case 'invalidDate':
      return INCOMPLETE;
    default:
      return 'Pick another day.';
  }
};

/**
 * A calendar day: a due date, a start date, the day a photo was taken.
 *
 * The same themed MUI X picker as `EventDateTimeField`, without the clock.
 * Days are stored at noon UTC (plan D6), so the value that leaves this field
 * is always `YYYY-MM-DDT12:00:00.000Z`.
 *
 * A half-typed date is never reported, and never clears the saved one. The
 * picker reports deleting one part of a date (the day, say, to type another)
 * exactly as it reports the clear button: both arrive as null. So a null only
 * counts as clearing when every part of the field is empty; otherwise the
 * saved date stands and the field asks for the rest. The picker is handed back
 * whatever is being typed, or a deleted part would reappear, so the field
 * keeps its own draft and passes on only whole days.
 */
export const DateField = ({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  minDate,
  maxDate,
}: DateFieldProps): JSX.Element => {
  const [problem, setProblem] = useState<DateValidationError | null>(null);
  const [incomplete, setIncomplete] = useState(false);
  const [draft, setDraft] = useState<Dayjs | null>(() => toPickerValue(value));
  const [syncedValue, setSyncedValue] = useState(value);
  // The picker's hidden input holds the typed text, and is empty only when
  // every part of the date is.
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  // Bumped each time the picker reports null, to run the check below once.
  const [nullReported, setNullReported] = useState(0);
  // The latest callback, for the check below, which runs after the render
  // that follows a null rather than inside the picker's event.
  const onChangeRef = useRef(onChange);
  const earliest = useMemo(() => toPickerValue(minDate) ?? undefined, [minDate]);
  const latest = useMemo(() => toPickerValue(maxDate) ?? undefined, [maxDate]);

  // A new value from outside (a record loading, a form reset) replaces the
  // draft, unless it is the day the draft already shows: that is this field's
  // own change coming back, and re-reading it would disturb the typing.
  if (value !== syncedValue) {
    setSyncedValue(value);
    const incoming = toPickerValue(value);
    const unchanged =
      incoming !== null && draft?.isValid() === true && incoming.isSame(draft, 'day');
    if (!unchanged) {
      setDraft(incoming);
      setIncomplete(false);
    }
  }

  const isFieldEmpty = (): boolean => hiddenInputRef.current?.value === '';

  const clear = (): void => {
    setIncomplete(false);
    onChange(null);
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Runs after the picker has redrawn its parts for a null, which is the
  // first moment it can be told whether the reader cleared the field or
  // deleted one part of it.
  useEffect(() => {
    if (nullReported === 0) return;
    if (hiddenInputRef.current?.value === '') {
      setIncomplete(false);
      onChangeRef.current(null);
    } else {
      setIncomplete(true);
    }
  }, [nullReported]);

  const handleChange = (next: Dayjs | null): void => {
    setDraft(next);
    if (next === null) {
      setNullReported((count) => count + 1);
      return;
    }
    const key = next.isValid() ? next.format('YYYY-MM-DD') : '';
    // Years before 1000 appear on the way to typing 2026 (0002, 0020, 0202)
    // and are not days anyone here means, so they wait for the fourth digit.
    if (isCalendarDateKey(key) && next.year() >= 1000) {
      setIncomplete(false);
      onChange(toCalendarDateIso(key));
    }
  };

  // The picker stays quiet when a field that already reads as null is
  // cleared or emptied, so those two cases are caught here.
  const handleClearButton = (): void => {
    if (draft === null) clear();
  };
  const handleBlur = (): void => {
    if (isFieldEmpty()) {
      if (value) clear();
      else setIncomplete(false);
    } else if (!draft?.isValid()) {
      setIncomplete(true);
    }
  };

  const message = error || (incomplete ? INCOMPLETE : pickerProblem(problem));

  return (
    <DatePicker
      label={
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <EventRoundedIcon sx={{ fontSize: 17 }} />
          {label}
        </Box>
      }
      value={draft}
      onChange={handleChange}
      onAccept={(accepted) => {
        if (accepted === null) handleClearButton();
      }}
      onError={setProblem}
      disabled={disabled}
      format="DD MMM YYYY"
      desktopModeMediaQuery="@media (min-width: 768px) and (pointer: fine)"
      minDate={earliest}
      maxDate={latest}
      slotProps={{
        field: { clearable: !required, onClear: handleClearButton, onBlur: handleBlur },
        textField: {
          fullWidth: true,
          required,
          error: Boolean(message),
          helperText: message || helperText,
          inputRef: hiddenInputRef,
          sx: { '& .MuiPickersOutlinedInput-root': { borderRadius: 2.5 } },
        },
        actionBar: {
          actions: required
            ? ['today', 'cancel', 'accept']
            : ['clear', 'today', 'cancel', 'accept'],
        },
        desktopPaper: { sx: { borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 8 } },
        mobilePaper: { sx: { borderRadius: 3, border: 1, borderColor: 'divider' } },
        popper: { sx: { zIndex: (theme) => theme.zIndex.modal + 1 } },
      }}
    />
  );
};
