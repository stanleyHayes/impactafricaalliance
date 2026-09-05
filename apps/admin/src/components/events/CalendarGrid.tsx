import type { Event } from '@iaa/shared';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { shiftMonth } from '../../lib/event-calendar';

import { EventImage } from './EventImage';

interface CalendarGridProps {
  events: Event[];
  month: Date;
  onMonthChange: (date: Date) => void;
  onSelectDay: (date: Date) => void;
  onSelectEvent: (event: Event) => void;
}
const dateKey = (date: Date): string => date.toLocaleDateString('sv-SE');


export const CalendarGrid = ({
  events,
  month,
  onMonthChange,
  onSelectDay,
  onSelectEvent,
}: CalendarGridProps): JSX.Element => {
  const [selected, setSelected] = useState<string | null>(null);
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    return day;
  });
  const monthEvents = events
    .filter((event) => {
      const day = new Date(event.startAt);
      return day.getFullYear() === month.getFullYear() && day.getMonth() === month.getMonth();
    })
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const agenda = selected
    ? events.filter((event) => dateKey(new Date(event.startAt)) === selected)
    : monthEvents;
  const navigate = (date: Date): void => {
    setSelected(null);
    onMonthChange(date);
  };
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" aria-live="polite">
          {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </Typography>
        <Stack direction="row">
          <Button onClick={() => navigate(new Date())}>Today</Button>
          <IconButton aria-label="Previous month" onClick={() => navigate(shiftMonth(month, -1))}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label="Next month" onClick={() => navigate(shiftMonth(month, 1))}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Select an event to view or edit it. Select a date to create an event. Times:{' '}
        {Intl.DateTimeFormat().resolvedOptions().timeZone}.
      </Typography>
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '1px',
          bgcolor: 'divider',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Box key={day} sx={{ bgcolor: 'background.paper', py: 1, textAlign: 'center' }}>
            <Typography variant="caption">{day}</Typography>
          </Box>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const entries = events.filter((event) => dateKey(new Date(event.startAt)) === key);
          return (
            <Box
              key={key}
              sx={{
                minHeight: { xs: 85, md: 140 },
                minWidth: 0,
                p: { xs: 0.5, md: 1 },
                bgcolor: 'background.paper',
                opacity: day.getMonth() === month.getMonth() ? 1 : 0.6,
              }}
            >
              <Button
                aria-label={`Create event on ${day.toLocaleDateString('en-GB')}`}
                onClick={() => onSelectDay(day)}
                size="small"
                sx={{
                  minWidth: 28,
                  p: 0.5,
                  color: key === dateKey(new Date()) ? 'primary.contrastText' : 'text.primary',
                  bgcolor: key === dateKey(new Date()) ? 'primary.main' : 'transparent',
                }}
              >
                {day.getDate()}
                <AddIcon sx={{ fontSize: 12, display: { xs: 'none', md: 'block' }, ml: 0.5 }} />
              </Button>
              <Stack spacing={0.75} sx={{ mt: 1, display: { xs: 'none', md: 'flex' } }}>
                {entries.slice(0, 2).map((event) => (
                  <Button
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    sx={{
                      display: 'block',
                      textAlign: 'left',
                      minWidth: 0,
                      p: 0.75,
                      borderLeft: '2px solid',
                      borderColor: event.status === 'draft' ? 'warning.main' : 'primary.main',
                      bgcolor: 'action.hover',
                      color: 'text.primary',
                    }}
                  >
                    <Typography variant="caption" component="span" sx={{ display: 'block' }}>
                      {new Date(event.startAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {event.status}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: 12,
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {event.title}
                    </Typography>
                  </Button>
                ))}
              </Stack>
              {entries.length > 0 && (
                <Button
                  size="small"
                  aria-label={`Show ${entries.length} events on ${day.toLocaleDateString('en-GB')}`}
                  onClick={() => setSelected(key)}
                  sx={{
                    minWidth: 0,
                    px: 0.5,
                    fontSize: 11,
                    display: { xs: 'inline-flex', md: entries.length > 2 ? 'inline-flex' : 'none' },
                  }}
                >
                  {entries.length} events
                </Button>
              )}
            </Box>
          );
        })}
      </Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 3, mb: 2 }}
      >
        <Typography variant="h6">
          {selected ?? 'This month'} · {agenda.length} events
        </Typography>
        {selected && <Button onClick={() => setSelected(null)}>Show month</Button>}
      </Stack>
      <Stack spacing={1}>
        {agenda.map((event) => (
          <Button
            key={event.id}
            onClick={() => onSelectEvent(event)}
            sx={{
              justifyContent: 'flex-start',
              textAlign: 'left',
              color: 'text.primary',
              p: 1.5,
              gap: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <EventImage
              src={event.image?.url}
              sx={{ width: 72, height: 64, flexShrink: 0, borderRadius: 1 }}
            />
            <Box>
              <Typography sx={{ fontWeight: 650 }}>{event.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(event.startAt).toLocaleString('en-GB')} · {event.status}
              </Typography>
            </Box>
          </Button>
        ))}
        {agenda.length === 0 && (
          <Typography color="text.secondary">
            No events here yet. Select a date to schedule one.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
