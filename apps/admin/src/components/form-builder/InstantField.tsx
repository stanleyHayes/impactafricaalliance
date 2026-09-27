import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import Box from '@mui/material/Box';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { DateTimeValidationError } from '@mui/x-date-pickers/models';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useRef, useState } from 'react';

const INCOMPLETE = 'Finish typing the date and time, or clear the field.';

const toPickerValue = (value: string | null | undefined): Dayjs | null => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const pickerProblem = (problem: DateTimeValidationError | null): string | null => {
  if (problem === null) return null;
  if (problem === 'invalidDate') return INCOMPLETE;
  if (problem === 'minDate' || problem === 'minTime' || problem === 'disablePast') {
    return 'Pick a later date and time.';
  }
  return 'Pick another date and time.';
};

export interface InstantFieldProps {
  label: string;
  /** An ISO instant, or null for none. */
  value: string | null | undefined;
  /** Called with a whole ISO instant, or null when the reader clears the field. */
  onChange: (value: string | null) => void;
  /** Told whenever the field holds something that is not yet a date, so a step can wait. */
  onProblemChange?: (problem: string | null) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

/**
 * A moment in time, such as when a form opens: the themed 12-hour MUI X
 * picker, shown in the reader's time zone and stored as a UTC instant.
 *
 * Built like the foundation's `DateField` rather than on `IsoDateTimeField`,
 * which reports a half-typed date as null and so clears the saved one. Here a
 * null only counts as clearing when every part of the field is empty; a date
 * still being typed keeps the saved value and asks for the rest (AGENTS.md:
 * an invalid date is never an intentional removal).
 */
export const InstantField = ({
  label,
  value,
  onChange,
  onProblemChange,
  error,
  helperText,
  disabled = false,
}: InstantFieldProps): JSX.Element => {
  const [draft, setDraft] = useState<Dayjs | null>(() => toPickerValue(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const [problem, setProblem] = useState<DateTimeValidationError | null>(null);
  const [incomplete, setIncomplete] = useState(false);
  const [nullReported, setNullReported] = useState(0);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);

  // A new value from outside replaces the draft, unless it is this field's own
  // change coming back, which would disturb the typing.
  if (value !== syncedValue) {
    setSyncedValue(value);
    const incoming = toPickerValue(value);
    const unchanged = incoming !== null && draft?.isValid() === true && incoming.isSame(draft);
    if (!unchanged) {
      setDraft(incoming);
      setIncomplete(false);
    }
  }

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // After a null, the field has redrawn its parts, so it can now tell a
  // cleared field from one part deleted on the way to typing another.
  useEffect(() => {
    if (nullReported === 0) return;
    if (hiddenInputRef.current?.value === '') {
      setIncomplete(false);
      onChangeRef.current(null);
    } else {
      setIncomplete(true);
    }
  }, [nullReported]);

  const message = error || (incomplete ? INCOMPLETE : pickerProblem(problem));
  const ownProblem = incomplete ? INCOMPLETE : pickerProblem(problem);

  useEffect(() => {
    onProblemChange?.(ownProblem);
  }, [ownProblem, onProblemChange]);

  const handleChange = (next: Dayjs | null): void => {
    setDraft(next);
    if (next === null) {
      setNullReported((count) => count + 1);
      return;
    }
    // Years before 1000 appear on the way to typing 2026, and are not meant.
    if (next.isValid() && next.year() >= 1000) {
      setIncomplete(false);
      onChange(next.toISOString());
    }
  };

  const clearIfEmpty = (): void => {
    if (draft === null) {
      setIncomplete(false);
      onChange(null);
    }
  };

  const handleBlur = (): void => {
    if (hiddenInputRef.current?.value === '') {
      setIncomplete(false);
      if (value) onChange(null);
    } else if (!draft?.isValid()) {
      setIncomplete(true);
    }
  };

  return (
    <DateTimePicker
      label={
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <ScheduleRoundedIcon sx={{ fontSize: 17 }} />
          {label}
        </Box>
      }
      value={draft}
      onChange={handleChange}
      onAccept={(accepted) => {
        if (accepted === null) clearIfEmpty();
      }}
      onError={setProblem}
      disabled={disabled}
      ampm
      format="DD MMM YYYY, hh:mm A"
      desktopModeMediaQuery="@media (min-width: 768px) and (pointer: fine)"
      closeOnSelect={false}
      slotProps={{
        field: { clearable: true, onClear: clearIfEmpty, onBlur: handleBlur },
        textField: {
          fullWidth: true,
          error: Boolean(message),
          helperText: message || helperText,
          inputRef: hiddenInputRef,
          sx: { '& .MuiPickersOutlinedInput-root': { borderRadius: 2.5 } },
        },
        actionBar: { actions: ['clear', 'cancel', 'accept'] },
        desktopPaper: { sx: { borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 8 } },
        mobilePaper: { sx: { borderRadius: 3, border: 1, borderColor: 'divider' } },
        popper: { sx: { zIndex: (theme) => theme.zIndex.modal + 1 } },
      }}
    />
  );
};
