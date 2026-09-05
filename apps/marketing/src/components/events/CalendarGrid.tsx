import type { Event } from '@iaa/shared';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { Box, Button, IconButton, Typography } from '@mui/material';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { formatEventDate, formatEventTime, formatEventType } from '../../lib/event-utils';

import { EventArtwork } from './EventArtwork';

const keyOf = (date: Date): string => date.toISOString().slice(0, 10);
const monthOf = (date: Date): string => keyOf(date).slice(0, 7);
const monthLabel = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const CalendarGrid = ({ events }: { events: Event[] }): JSX.Element => {
  const today = new Date();
  const firstRelevant =
    events.find((event) => Date.parse(event.endAt ?? event.startAt) >= today.getTime()) ??
    events[events.length - 1];
  const [month, setMonth] = useState(() => new Date(firstRelevant?.startAt ?? today));
  const [selected, setSelected] = useState<string | null>(null);
  const year = month.getUTCFullYear();
  const index = month.getUTCMonth();
  const offset = (new Date(Date.UTC(year, index, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const monthEvents = events.filter((event) => monthOf(new Date(event.startAt)) === monthOf(month));
  const agenda = selected
    ? monthEvents.filter((event) => keyOf(new Date(event.startAt)) === selected)
    : monthEvents;
  const move = (amount: number): void => {
    setMonth(new Date(Date.UTC(year, index + amount, 1)));
    setSelected(null);
  };
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" component="h3" aria-live="polite">
          {monthLabel.format(month)}
        </Typography>
        <Stack direction="row" alignItems="center">
          <Button
            onClick={() => {
              setMonth(today);
              setSelected(null);
            }}
          >
            Today
          </Button>
          <IconButton aria-label="Previous month" onClick={() => move(-1)}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label="Next month" onClick={() => move(1)}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>
      <Box
        sx={{
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
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <Box key={day} sx={{ bgcolor: 'background.paper', textAlign: 'center', py: 1.5 }}>
            <Typography variant="caption">{day}</Typography>
          </Box>
        ))}
        {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, cell) => {
          const day = cell - offset + 1;
          if (day < 1 || day > days)
            return <Box key={cell} sx={{ bgcolor: 'background.default' }} />;
          const key = keyOf(new Date(Date.UTC(year, index, day)));
          const entries = monthEvents.filter((event) => keyOf(new Date(event.startAt)) === key);
          return (
            <Box
              key={key}
              component="button"
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={selected === key}
              aria-label={`${formatEventDate(key)} — ${entries.length} events`}
              sx={{
                font: 'inherit',
                color: 'text.primary',
                textAlign: 'left',
                border: 0,
                cursor: 'pointer',
                minWidth: 0,
                minHeight: { xs: 72, md: 142 },
                p: { xs: 0.75, md: 1.5 },
                bgcolor: selected === key ? 'action.selected' : 'background.paper',
                boxShadow: selected === key ? 'inset 0 0 0 2px #00D68B' : 'none',
                '&:hover': { bgcolor: 'action.hover' },
                '&:focus-visible': { outline: '2px solid #F5B800', outlineOffset: -3 },
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  bgcolor: key === keyOf(today) ? '#00D68B' : 'transparent',
                  color: key === keyOf(today) ? '#0E2A22' : 'inherit',
                  mb: 1,
                }}
              >
                {day}
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                {entries.slice(0, 2).map((event) => (
                  <Box key={event.id} sx={{ borderLeft: '2px solid #F5B800', pl: 0.75, mb: 1 }}>
                    <Typography
                      component="span"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: 11,
                        color: 'text.secondary',
                      }}
                    >
                      <AccessTimeRoundedIcon sx={{ fontSize: 13, flexShrink: 0 }} />
                      {formatEventTime(event.startAt)}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: 12,
                        fontWeight: 650,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {event.title}
                    </Typography>
                  </Box>
                ))}
                {entries.length > 2 && (
                  <Typography variant="caption">+{entries.length - 2} more</Typography>
                )}
              </Box>
              {entries.length > 0 && (
                <Typography
                  component="span"
                  sx={{
                    display: { xs: 'block', md: 'none' },
                    color: 'text.primary',
                    fontSize: 11,
                    borderBottom: '3px solid #F5B800',
                    width: 'fit-content',
                  }}
                >
                  {entries.length}{' '}
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    events
                  </Box>
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 4, mb: 2 }}
      >
        <Typography variant="h5" component="h3">
          {selected ? formatEventDate(selected) : 'This month'}{' '}
          <Typography component="span" color="text.secondary">
            / {agenda.length}
          </Typography>
        </Typography>
        {selected && <Button onClick={() => setSelected(null)}>Show month</Button>}
      </Stack>
      <Stack spacing={2}>
        {agenda.map((event) => (
          <Box
            key={event.id}
            component={RouterLink}
            to={`/events/${event.id}`}
            sx={{
              display: 'flex',
              gap: { xs: 2, md: 3 },
              p: 1.5,
              alignItems: 'center',
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              color: 'text.primary',
              textDecoration: 'none',
              bgcolor: 'background.paper',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <EventArtwork
              src={event.image?.url}
              sx={{
                width: { xs: 88, sm: 160 },
                height: { xs: 105, sm: 110 },
                flexShrink: 0,
                borderRadius: 2,
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  columnGap: 1.5,
                  rowGap: 0.5,
                  color: 'text.secondary',
                }}
              >
                <Typography variant="caption">{formatEventType(event.type)}</Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                >
                  <CalendarTodayIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                  {formatEventDate(event.startAt)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                >
                  <AccessTimeRoundedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                  {formatEventTime(event.startAt)} GMT
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ my: 0.5, lineHeight: 1.3 }}>
                {event.title}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.5,
                  color: 'text.secondary',
                }}
              >
                <LocationOnOutlinedIcon sx={{ fontSize: 18, mt: 0.2, flexShrink: 0 }} />
                <Typography variant="body2">{event.location}</Typography>
              </Box>
            </Box>
            <Box
              aria-hidden="true"
              sx={{ ml: 'auto', pr: 2, display: { xs: 'none', sm: 'block' }, fontSize: 28 }}
            >
              ↗
            </Box>
          </Box>
        ))}
        {agenda.length === 0 && (
          <Box sx={{ py: 4 }}>
            <Typography color="text.secondary">
              No matching events {selected ? 'on this day' : 'this month'}.
            </Typography>
            {firstRelevant && (
              <Button
                sx={{ mt: 1 }}
                onClick={() => {
                  setMonth(new Date(firstRelevant.startAt));
                  setSelected(null);
                }}
              >
                Go to a matching event
              </Button>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  );
};
