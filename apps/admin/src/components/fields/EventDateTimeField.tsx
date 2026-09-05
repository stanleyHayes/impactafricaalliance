import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Box from '@mui/material/Box';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { DateTimeValidationError } from '@mui/x-date-pickers/models';
import type { Dayjs } from 'dayjs';

interface EventDateTimeFieldProps {
  label: string;
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  onError: (error: DateTimeValidationError) => void;
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
    onError={onError}
    disabled={disabled}
    ampm={false}
    format="DD MMM YYYY, HH:mm"
    desktopModeMediaQuery="@media (min-width: 768px) and (pointer: fine)"
    closeOnSelect={false}
    minutesStep={1}
    timeSteps={{ minutes: 1 }}
    minDateTime={minDateTime}
    maxDateTime={maxDateTime}
    slotProps={{
      field: { clearable: !required },
      textField: {
        fullWidth: true,
        required,
        error: Boolean(error),
        helperText: error || helperText,
        sx: { '& .MuiPickersOutlinedInput-root': { borderRadius: 2.5 } },
      },
      actionBar: { actions: required ? ['cancel', 'accept'] : ['clear', 'cancel', 'accept'] },
      desktopPaper: { sx: { borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 8 } },
      mobilePaper: { sx: { borderRadius: 3, border: 1, borderColor: 'divider' } },
      popper: { sx: { zIndex: (theme) => theme.zIndex.modal + 1 } },
    }}
  />
);
