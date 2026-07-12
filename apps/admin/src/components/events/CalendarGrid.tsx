import type { Event, EventType } from '@iaa/shared';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';

interface CalendarGridProps {
  events: Event[];
  month: Date;
  onMonthChange: (date: Date) => void;
  onSelectDay: (date: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS: Record<EventType, string> = {
  webinar: 'primary.main',
  'cohort-launch': 'secondary.main',
  'partner-forum': 'info.main',
  'community-event': 'success.main',
  other: 'warning.main',
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfWeek = (date: Date): Date => {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() - shifted.getDay());
  return shifted;
};

const dateKey = (date: Date): string => date.toLocaleDateString('sv-SE');

const monthLabel = (date: Date): string =>
  date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export const CalendarGrid = ({ events, month, onMonthChange, onSelectDay }: CalendarGridProps): JSX.Element => {
  const theme = useTheme();
  const today = new Date();
  const todayKey = dateKey(today);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const key = dateKey(new Date(event.startAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);

  const handlePrevious = (): void => {
    const previous = new Date(month);
    previous.setMonth(previous.getMonth() - 1);
    onMonthChange(previous);
  };

  const handleNext = (): void => {
    const next = new Date(month);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  };

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {monthLabel(month)}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <IconButton aria-label="Previous month" onClick={handlePrevious} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label="Next month" onClick={handleNext} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {WEEKDAYS.map((day) => (
          <Typography
            key={day}
            variant="caption"
            sx={{
              py: 1,
              textAlign: 'center',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'text.secondary',
            }}
          >
            {day}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, index) => {
          const key = dateKey(day);
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const isToday = key === todayKey;
          const dayEvents = eventsByDay.get(key) ?? [];
          const numberColor = ((): string => {
            if (isToday) return theme.palette.primary.contrastText;
            return isCurrentMonth ? 'text.primary' : 'text.disabled';
          })();

          return (
            <Box
              key={index}
              onClick={() => onSelectDay(day)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectDay(day);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${day.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}, ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
              sx={{
                minHeight: { xs: 72, sm: 96 },
                p: 1,
                borderRight: (index + 1) % 7 === 0 ? 0 : 1,
                borderBottom: 1,
                borderColor: 'divider',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                transition: theme.transitions.create('background-color'),
                bgcolor: isToday ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isToday ? 700 : 500,
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  bgcolor: isToday ? 'primary.main' : 'transparent',
                  color: numberColor,
                }}
              >
                {day.getDate()}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {dayEvents.slice(0, 4).map((event) => (
                  <Box
                    key={event.id}
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: EVENT_COLORS[event.type],
                    }}
                  />
                ))}
                {dayEvents.length > 4 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1 }}>
                    +{dayEvents.length - 4}
                  </Typography>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
