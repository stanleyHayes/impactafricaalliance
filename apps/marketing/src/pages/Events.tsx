import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Alert,
  Box,
  Button,
  Grid,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Stack from '@mui/material/Stack';
import { useState } from 'react';

import { CalendarGrid } from '../components/events/CalendarGrid';
import { EventCard } from '../components/events/EventCard';
import { EventEmptyState } from '../components/events/EventEmptyState';
import { OptionSelect } from '../components/forms/OptionSelect';
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
  const hasFilters = Boolean(query || type !== 'all' || period !== 'all');
  const isEmpty = !isLoading && !isError && filtered.length === 0;
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
        <EventEmptyState hasEvents={events.length > 0} onReset={hasFilters ? reset : undefined} />
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
        <Stack spacing={3} sx={{ mb: isEmpty ? 2 : 4 }}>
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
            <OptionSelect
              label="Event type"
              value={type}
              onChange={setType}
              options={[
                { value: 'all', label: 'All types', description: 'Every kind of event together.' },
                ...[...new Set(events.map((event) => event.type))].sort().map((item) => ({
                  value: item,
                  label: formatEventType(item),
                })),
              ]}
            />
            <OptionSelect
              label="When"
              value={period}
              onChange={(value) => setPeriod(value as EventPeriod)}
              options={[
                { value: 'all', label: 'All dates', description: 'Past and future together.' },
                {
                  value: 'upcoming',
                  label: 'Upcoming & ongoing',
                  description: 'Still to come, or happening now.',
                  icon: <EventAvailableRoundedIcon />,
                },
                {
                  value: 'past',
                  label: 'Past events',
                  description: 'Already finished — where reviews and recordings live.',
                  icon: <HistoryRoundedIcon />,
                },
              ]}
            />
          </Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography role="status" variant="body2" color="text.secondary">
              {isLoading
                ? 'Finding events'
                : `${filtered.length} event${filtered.length === 1 ? '' : 's'}`}{' '}
              · All times GMT
            </Typography>
            {hasFilters && !isEmpty && <Button onClick={reset}>Clear filters</Button>}
          </Stack>
        </Stack>
        {renderContent()}
      </Section>
    </>
  );
};
export default Events;
