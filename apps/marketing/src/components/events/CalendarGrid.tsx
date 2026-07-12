import type { Event } from '@iaa/shared';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import {
  formatEventDate,
  formatEventTime,
  formatEventType,
  sortEventsByDate,
} from '../../lib/event-utils';

interface DayCell {
  day: number | null;
  key: string;
}

interface CalendarDayCellProps {
  cell: DayCell;
  eventsByDay: Map<string, Event[]>;
  index: number;
  onSelect: (target: HTMLElement, key: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateKey = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const keyForDay = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const todayKey = (): string => dateKey(new Date());

const dayNumberSx = (isToday: boolean) => ({
  width: 28,
  height: 28,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  bgcolor: isToday ? 'primary.main' : 'transparent',
  color: isToday ? 'primary.contrastText' : 'text.primary',
  fontWeight: isToday ? 700 : 500,
  fontSize: '0.9rem',
});

const cellSx = (isLastColumn: boolean) => ({
  minHeight: { xs: 80, sm: 96, md: 110 },
  p: 1,
  borderRight: isLastColumn ? 0 : 1,
  borderBottom: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
});

const EventDots = ({ events }: { events: Event[] }): JSX.Element => (
  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
    {events.slice(0, 3).map((event, index) => (
      <Box
        key={`${event.id}-${index}`}
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: index === 0 ? 'secondary.main' : 'primary.main',
        }}
      />
    ))}
    {events.length > 3 && (
      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
        +{events.length - 3}
      </Typography>
    )}
  </Stack>
);

const CalendarDayCell = ({ cell, eventsByDay, index, onSelect }: CalendarDayCellProps): JSX.Element => {
  const isLastColumn = (index + 1) % 7 === 0;

  if (cell.day === null) {
    return <Box sx={cellSx(isLastColumn)} />;
  }

  const isToday = cell.key === todayKey();
  const dayEvents = eventsByDay.get(cell.key) ?? [];
  const hasEvents = dayEvents.length > 0;

  if (!hasEvents) {
    return (
      <Box sx={cellSx(isLastColumn)}>
        <Box sx={dayNumberSx(isToday)}>{cell.day}</Box>
      </Box>
    );
  }

  const handleClick = (event: React.MouseEvent<HTMLElement>): void => {
    onSelect(event.currentTarget, cell.key);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(event.currentTarget, cell.key);
    }
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${cell.day} — ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
      sx={{
        ...cellSx(isLastColumn),
        cursor: 'pointer',
        transition: 'background-color 150ms ease',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Box sx={dayNumberSx(isToday)}>{cell.day}</Box>
      <EventDots events={dayEvents} />
    </Box>
  );
};

interface CalendarGridProps {
  events: Event[];
}

export const CalendarGrid = ({ events }: CalendarGridProps): JSX.Element => {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const key = dateKey(new Date(event.startAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(sortEventsByDate);
    }
    return map;
  }, [events]);

  const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const startOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: DayCell[] = useMemo(() => {
    const result: DayCell[] = [];
    for (let index = 0; index < totalCells; index += 1) {
      const dayNumber = index - startOffset + 1;
      if (dayNumber >= 1 && dayNumber <= daysInMonth) {
        result.push({ day: dayNumber, key: keyForDay(year, month, dayNumber) });
      } else {
        result.push({ day: null, key: `empty-${index}` });
      }
    }
    return result;
  }, [daysInMonth, month, startOffset, totalCells, year]);

  const selectedEvents = selectedKey ? (eventsByDay.get(selectedKey) ?? []) : [];
  const monthLabel = monthFormatter.format(new Date(Date.UTC(year, month, 1)));

  const handlePrevious = (): void => {
    if (month === 0) {
      setYear((previous) => previous - 1);
      setMonth(11);
    } else {
      setMonth((previous) => previous - 1);
    }
  };

  const handleNext = (): void => {
    if (month === 11) {
      setYear((previous) => previous + 1);
      setMonth(0);
    } else {
      setMonth((previous) => previous + 1);
    }
  };

  const openPopover = (target: HTMLElement, key: string): void => {
    const dayEvents = eventsByDay.get(key);
    if (!dayEvents || dayEvents.length === 0) {
      return;
    }
    setAnchorEl(target);
    setSelectedKey(key);
  };

  const handleClose = (): void => {
    setAnchorEl(null);
    setSelectedKey(null);
  };

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {monthLabel}
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={handlePrevious} aria-label="Previous month" size="small">
            <ChevronLeftIcon />
          </IconButton>
          <IconButton onClick={handleNext} aria-label="Next month" size="small">
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {WEEKDAYS.map((weekday) => (
          <Box
            key={weekday}
            sx={{
              py: 1.5,
              textAlign: 'center',
              bgcolor: 'action.hover',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
              {weekday}
            </Typography>
          </Box>
        ))}

        {cells.map((cell, index) => (
          <CalendarDayCell
            key={cell.key}
            cell={cell}
            eventsByDay={eventsByDay}
            index={index}
            onSelect={openPopover}
          />
        ))}
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 320, borderRadius: 3, p: 2 } } }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {selectedEvents[0] ? formatEventDate(selectedEvents[0].startAt) : 'Events'}
        </Typography>
        <Stack spacing={2}>
          {selectedEvents.map((event) => (
            <Box key={event.id}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {event.title}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                <Chip size="small" label={formatEventType(event.type)} sx={{ height: 22, fontSize: '0.7rem' }} />
              </Stack>
              <Stack direction="row" spacing={0.7} alignItems="center" sx={{ mt: 0.75, color: 'text.secondary' }}>
                <AccessTimeRoundedIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{formatEventTime(event.startAt)}</Typography>
              </Stack>
              <Stack direction="row" spacing={0.7} alignItems="center" sx={{ mt: 0.25, color: 'text.secondary' }}>
                <PlaceRoundedIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{event.location}</Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Popover>
    </Box>
  );
};
