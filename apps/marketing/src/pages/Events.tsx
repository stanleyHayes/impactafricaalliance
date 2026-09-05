import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Alert,
  Box,
  Button,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Stack from '@mui/material/Stack';
import { useState } from 'react';

import { CalendarGrid } from '../components/events/CalendarGrid';
import { EventCard } from '../components/events/EventCard';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { EventListSkeleton, CalendarSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { useEvents, usePageCopy } from '../lib/content-hooks';
import { filterEvents, type EventPeriod } from '../lib/event-discovery';
import { formatEventType } from '../lib/event-utils';

const Events = (): JSX.Element => {
  const copy = usePageCopy('events', {
    seoTitle: 'Events',
    seoDescription: 'Meet, learn and build with Impact Africa Alliance.',
    heroEyebrow: 'Gather with us',
    heroTitle: 'Good things start with a conversation.',
    heroSubtitle:
      'Discover workshops, conversations and gatherings connecting people and ideas across Africa.',
  });
  const { data, isLoading, isError, refetch } = useEvents();
  const [view, setView] = useState('card');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [period, setPeriod] = useState<EventPeriod>('all');
  const events = data?.items ?? [];
  const filtered = filterEvents(events, { query, type, period });
  const reset = (): void => {
    setQuery('');
    setType('all');
    setPeriod('all');
  };
  const renderContent = (): JSX.Element => {
    if (isLoading) return view === 'calendar' ? <CalendarSkeleton /> : <EventListSkeleton />;
    if (isError)
      return (
        <Alert severity="warning" action={<Button onClick={() => void refetch()}>Retry</Button>}>
          Events could not be loaded. Please try again.
        </Alert>
      );
    if (filtered.length === 0)
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4">
            {events.length ? 'No events match just yet.' : 'New gatherings are on their way.'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Try another topic or check back for the next Alliance event.
          </Typography>
          {events.length > 0 && (
            <Button onClick={reset} sx={{ mt: 2 }}>
              Reset filters
            </Button>
          )}
        </Box>
      );
    if (view === 'calendar')
      return <CalendarGrid key={`${query}:${type}:${period}`} events={filtered} />;
    return (
      <Grid container spacing={3}>
        {filtered.map((event) => (
          <Grid key={event.id} size={12}>
            <EventCard event={event} />
          </Grid>
        ))}
      </Grid>
    );
  };
  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <PageHero
        eyebrow={copy.heroEyebrow}
        title={copy.heroTitle}
        subtitle={copy.heroSubtitle}
        watermark="network"
        image={copy.heroImageUrl ?? IMAGES.teamArtwork}
      />
      <Section>
        <Stack spacing={3} sx={{ mb: 4 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                THE ALLIANCE CALENDAR
              </Typography>
              <Typography variant="h3" component="h2">
                Find your next connection.
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, value: string | null) => value && setView(value)}
              aria-label="Event view"
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              <ToggleButton value="card" aria-label="Card view">
                <GridViewRoundedIcon sx={{ mr: 1 }} />
                Explore
              </ToggleButton>
              <ToggleButton value="calendar" aria-label="Calendar view">
                <CalendarMonthRoundedIcon sx={{ mr: 1 }} />
                Calendar
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
              gap: 2,
              p: { xs: 2, md: 3 },
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
            }}
          >
            <TextField
              label="Search events"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Topic, location or host"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              label="Event type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="all">All types</MenuItem>
              {[...new Set(events.map((event) => event.type))].sort().map((item) => (
                <MenuItem key={item} value={item}>
                  {formatEventType(item)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="When"
              value={period}
              onChange={(e) => setPeriod(e.target.value as EventPeriod)}
            >
              <MenuItem value="all">All dates</MenuItem>
              <MenuItem value="upcoming">Upcoming & ongoing</MenuItem>
              <MenuItem value="past">Past events</MenuItem>
            </TextField>
          </Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography role="status" variant="body2" color="text.secondary">
              {isLoading
                ? 'Finding events'
                : `${filtered.length} event${filtered.length === 1 ? '' : 's'}`}{' '}
              · All times GMT
            </Typography>
            {(query || type !== 'all' || period !== 'all') && (
              <Button onClick={reset}>Clear filters</Button>
            )}
          </Stack>
        </Stack>
        {renderContent()}
      </Section>
    </>
  );
};
export default Events;
