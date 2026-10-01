import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Box from '@mui/material/Box';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { DateTimeValidationError } from '@mui/x-date-pickers/models';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react';

import { pickerDesktopPaperSx, pickerFieldSx, pickerMobilePaperSx } from './picker-surface';

interface EventDateTimeFieldProps {
  label: string;
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  /** The picker's own check of the value it holds, with that value. */
  onError: (error: DateTimeValidationError, value: Dayjs | null) => void;
  /** A date settled from the calendar, or null from its Clear. */
  onAccept?: (value: Dayjs | null) => void;
  /** The field's own clear button. */
  onClear?: () => void;
  onBlur?: () => void;
  /** After each key, once the field shows what the key did. */
  onKeyUp?: () => void;
  /** Text pasted over the whole date, which the picker reads straight after. */
  onPaste?: () => void;
  /** The hidden input holding the typed text, which is empty only when every part is. */
  inputRef?: Ref<HTMLInputElement>;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  minDateTime?: Dayjs;
  maxDateTime?: Dayjs;
}

/** Calendar and clock views are rendered by MUI on both mouse and touch devices. */
export const EventDateTimeField = ({
  label,
  value,
  onChange,
  onError,
  onAccept,
  onClear,
  onBlur,
  onKeyUp,
  onPaste,
  inputRef,
  error,
  helperText,
  required = false,
  disabled = false,
  minDateTime,
  maxDateTime,
}: EventDateTimeFieldProps): JSX.Element => (
  <DateTimePicker
    label={
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <CalendarTodayIcon sx={{ fontSize: 17 }} />
        {label}
      </Box>
    }
    value={value}
    onChange={onChange}
    onAccept={onAccept}
    onError={onError}
    disabled={disabled}
    ampm
    // 12-hour throughout: the team reads 6:00 PM, not 18:00.
    format="DD MMM YYYY, hh:mm A"
    desktopModeMediaQuery="@media (min-width: 768px) and (pointer: fine)"
    closeOnSelect={false}
    minutesStep={1}
    timeSteps={{ minutes: 1 }}
    minDateTime={minDateTime}
    maxDateTime={maxDateTime}
    slotProps={{
      field: { clearable: !required, onClear, onBlur, onKeyUp, onPaste },
      textField: {
        fullWidth: true,
        required,
        error: Boolean(error),
        helperText: error || helperText,
        inputRef,
        sx: pickerFieldSx,
      },
      actionBar: { actions: required ? ['cancel', 'accept'] : ['clear', 'cancel', 'accept'] },
      desktopPaper: { sx: pickerDesktopPaperSx },
      mobilePaper: { sx: pickerMobilePaperSx },
      popper: { sx: { zIndex: (theme) => theme.zIndex.modal + 1 } },
    }}
  />
);

const INCOMPLETE = 'Finish typing the date and time, or clear the field.';

const toPickerValue = (value: string | null | undefined): Dayjs | null => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

/** A moment worth passing on: years before 1000 appear on the way to typing 2026. */
const isWhole = (moment: Dayjs | null): moment is Dayjs =>
  moment !== null && moment.isValid() && moment.year() >= 1000;

/**
 * What the picker's own checks say about a whole date, in words. A date not
 * yet whole is the field's own business (see `partial` below): the picker
 * calls it invalid, or too early while its year is being typed.
 */
const limitProblem = (problem: DateTimeValidationError): string | null => {
  if (problem === null || problem === 'invalidDate') return null;
  if (problem === 'minDate' || problem === 'minTime') return 'Pick a later date and time.';
  if (problem === 'maxDate' || problem === 'maxTime') return 'Pick an earlier date and time.';
  return 'Pick another date and time.';
};

interface Message {
  /** What the field says under it as an error. */
  error?: string;
  /** What it says there otherwise. */
  helperText?: string;
}

/**
 * A date still being typed gets a hint, which becomes an error once the
 * field is left with it; the form's own error, or a limit, is an error at
 * once. The hint sits where the error will, so leaving the field changes
 * only its colour.
 */
const messageFor = ({
  error,
  problem,
  typing,
  helperText,
}: {
  error?: string;
  problem: string | null;
  typing: boolean;
  helperText?: string;
}): Message => {
  if (error) return { error };
  if (problem && !typing) return { error: problem };
  return { helperText: problem ?? helperText };
};

interface IsoDateTimeFieldProps {
  label: string;
  value: string | null | undefined;
  /**
   * Called with a whole ISO instant, or null when the reader clears the
   * field. Null, never undefined: undefined is dropped by JSON, so a cleared
   * date would survive a PATCH.
   */
  onChange: (value: string | null) => void;
  /**
   * Told whenever the field holds something that is not yet a whole date
   * (half typed, or outside the picker's range), and told null once it does
   * again or leaves the screen. The field never passes such a date on, so
   * the form must refuse to continue or save while this is set.
   */
  onProblemChange?: (problem: string | null) => void;
  error?: string;
  helperText?: string;
}

/**
 * The same picker for forms that hold an ISO string rather than a Dayjs.
 *
 * The CMS forms used `<input type="datetime-local">`, which hands the browser's
 * own calendar to the reader — a different control on every machine, 24-hour on
 * most of them, and nothing like the rest of the console.
 *
 * It works like `DateField` and `InstantField`. The picker reports deleting one
 * part of a date (the year, say, to type another) exactly as it reports the
 * clear button: both arrive as null. Passed on, that null removed the saved
 * date on the next save (AGENTS.md: an invalid date is never an intentional
 * removal). So a null only counts as clearing when every part of the field is
 * empty; otherwise the saved date stands, the field asks for the rest, and
 * `onProblemChange` holds the form back. Text pasted over the whole date that
 * is not a date also arrives as null, and is ignored. The field keeps its own
 * draft for the picker, or a deleted part would reappear.
 *
 * Every re-render this field causes while someone types happens as the key's
 * own render commits, never a moment later. The picker keeps a part typed
 * into an unfinished date only until its next render; a later render of ours
 * that landed after the next key made it rebuild every part from the
 * unfinished date, which left them all empty.
 */
export const IsoDateTimeField = ({
  label,
  value,
  onChange,
  onProblemChange,
  error,
  helperText,
}: IsoDateTimeFieldProps): JSX.Element => {
  const [draft, setDraft] = useState<Dayjs | null>(() => toPickerValue(value));
  const [syncedValue, setSyncedValue] = useState(value);
  // Whether the field shows any part of a date. The picker's hidden input
  // holds what it shows, and is empty only when every part is.
  const [typed, setTyped] = useState(() => toPickerValue(value) !== null);
  // Left half typed: said as an error from then on, until whole or empty.
  const [left, setLeft] = useState(false);
  const [limit, setLimit] = useState<DateTimeValidationError>(null);
  // Bumped each time the picker reports null, to run the check below once.
  const [nullReported, setNullReported] = useState(0);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  // Set while a paste is read: text the picker cannot read as a date arrives
  // as null, like a clear, but is not one, so the saved date stays.
  const pasting = useRef(false);
  const onChangeRef = useRef(onChange);
  const onProblemChangeRef = useRef(onProblemChange);

  // A new value from outside (a record loading, a form reset) replaces the
  // draft, unless it is this field's own change coming back, which would
  // disturb the typing.
  if (value !== syncedValue) {
    setSyncedValue(value);
    const incoming = toPickerValue(value);
    if (!(incoming && draft?.isValid() && incoming.isSame(draft))) {
      setDraft(incoming);
      setTyped(incoming !== null);
      setLeft(false);
    }
  }

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    onProblemChangeRef.current = onProblemChange;
  });

  // After a null the picker has redrawn its parts, so a cleared field can now
  // be told from one part deleted on the way to typing another. Checked as
  // that render commits, so whatever it changes is drawn before the next key.
  useLayoutEffect(() => {
    if (nullReported === 0) return;
    if (hiddenInputRef.current?.value === '') {
      setTyped(false);
      setLeft(false);
      onChangeRef.current(null);
    } else {
      setTyped(true);
    }
  }, [nullReported]);

  const partial = typed && !isWhole(draft);
  const ownProblem = partial ? INCOMPLETE : limitProblem(limit);
  useEffect(() => {
    onProblemChangeRef.current?.(ownProblem);
  }, [ownProblem]);
  // A field that leaves the screen takes its half-typed text with it, and
  // shows the saved date when it returns, so its problem goes too.
  useEffect(() => () => onProblemChangeRef.current?.(null), []);

  const handleChange = (next: Dayjs | null): void => {
    if (next === null && pasting.current) return;
    setDraft(next);
    if (next === null) {
      // Taken as cleared until the check above says otherwise, so a field
      // that is cleared never reports a problem on the way.
      setTyped(false);
      setNullReported((count) => count + 1);
      return;
    }
    setTyped(true);
    if (isWhole(next)) {
      setLeft(false);
      onChange(next.toISOString());
    }
  };

  const clear = (): void => {
    setTyped(false);
    setLeft(false);
    onChange(null);
  };
  // The picker stays quiet when a field that already reads as null is
  // cleared, so that case is caught here.
  const clearIfEmpty = (): void => {
    if (draft === null) clear();
  };
  // Nor does it say anything about parts typed into an empty field until
  // every part is filled, so the field looks for itself after each key.
  // Asking for the rest while it is typed means leaving it half typed only
  // turns the words red: they used to appear then, and pushed the buttons
  // below down between the press and release of a click on Continue.
  const handleKeyUp = (): void => {
    const shown = hiddenInputRef.current?.value !== '';
    setTyped(shown);
    if (!shown) setLeft(false);
  };
  const handleBlur = (): void => {
    if (hiddenInputRef.current?.value !== '') {
      setTyped(true);
      if (!isWhole(draft)) setLeft(true);
    } else if (value) {
      // Every part deleted one by one: as deliberate as the clear button.
      clear();
    } else {
      setTyped(false);
      setLeft(false);
    }
  };

  return (
    <EventDateTimeField
      label={label}
      value={draft}
      onChange={handleChange}
      onAccept={(accepted) => {
        if (accepted === null) clearIfEmpty();
      }}
      // Only a whole date's problems: the rest are the field's own.
      onError={(problem, moment) => setLimit(isWhole(moment) ? problem : null)}
      onClear={clearIfEmpty}
      onBlur={handleBlur}
      onKeyUp={handleKeyUp}
      onPaste={() => {
        pasting.current = true;
        setTimeout(() => {
          pasting.current = false;
        });
      }}
      inputRef={hiddenInputRef}
      {...messageFor({ error, problem: ownProblem, typing: partial && !left, helperText })}
    />
  );
};
