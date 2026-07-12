import type { Event } from '@iaa/shared';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { CalendarGrid } from '../components/events/CalendarGrid';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { CardGridSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { useEvents, useHeroImage } from '../lib/content-hooks';
import {
  formatEventDate,
  formatEventTime,
  formatEventType,
  sortEventsByDate,
} from '../lib/event-utils';

const DESCRIPTION_MAX_LENGTH = 160;

const eventExcerpt = (description: string): string => {
  if (description.length <= DESCRIPTION_MAX_LENGTH) {
    return description;
  }
  const trimmed = description.slice(0, DESCRIPTION_MAX_LENGTH).trimEnd();
  return `${trimmed}…`;
};

const EventsMessage = ({ children }: { children: string }): JSX.Element => (
  <Box
    sx={{
      maxWidth: 640,
      mx: 'auto',
      px: 4,
      py: 7,
      border: 1,
      borderColor: 'divider',
      borderRadius: 4,
      bgcolor: 'background.paper',
      textAlign: 'center',
    }}
  >
    <Box
      sx={{
        display: 'grid',
        width: 64,
        height: 64,
        mx: 'auto',
        mb: 2,
        placeItems: 'center',
        borderRadius: '50%',
        bgcolor: 'rgba(0,30,20,0.08)',
        color: 'text.primary',
      }}
    >
      <EventRoundedIcon />
    </Box>
    <Typography color="text.secondary">{children}</Typography>
  </Box>
);

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps): JSX.Element => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease',
      '&:hover': {
        borderColor: (theme) => (theme.palette.mode === 'light' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)'),
        boxShadow: '0 22px 48px -34px rgba(0,0,0,0.18)',
        transform: 'translateY(-4px)',
      },
    }}
  >
    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', mb: 1.5 }}>
        <AccessTimeRoundedIcon fontSize="small" />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {formatEventDate(event.startAt)} · {formatEventTime(event.startAt)}
        </Typography>
      </Stack>

      <Typography variant="h5" component="h3" sx={{ fontWeight: 700, mb: 1 }}>
        {event.title}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Chip size="small" label={formatEventType(event.type)} />
      </Stack>

      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary', mb: 1.5 }}>
        <PlaceRoundedIcon fontSize="small" />
        <Typography variant="body2">{event.location}</Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.65 }}>
        {eventExcerpt(event.description)}
      </Typography>
    </CardContent>
  </Card>
);

interface EventsCardListProps {
  events: Event[];
}

const EventsCardList = ({ events }: EventsCardListProps): JSX.Element => {
  const now = Date.now();
  const upcoming = events.filter((event) => new Date(event.startAt).getTime() >= now).sort(sortEventsByDate);
  const past = events
    .filter((event) => new Date(event.startAt).getTime() < now)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  return (
    <Stack spacing={6}>
      {upcoming.length > 0 && (
        <Box>
          <Typography variant="h4" component="h2" sx={{ mb: 3, fontWeight: 700 }}>
            Upcoming events
          </Typography>
          <Grid container spacing={3}>
            {upcoming.map((event) => (
              <Grid key={event.id} size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                <EventCard event={event} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {past.length > 0 && (
        <Box>
          <Typography variant="h4" component="h2" sx={{ mb: 3, fontWeight: 700 }}>
            Past events
          </Typography>
          <Grid container spacing={3}>
            {past.map((event) => (
              <Grid key={event.id} size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                <EventCard event={event} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Stack>
  );
};

type EventView = 'calendar' | 'card';

const Events = (): JSX.Element => {
  const heroImage = useHeroImage('events', IMAGES.community);
  const { data, isLoading, isError } = useEvents();
  const events = data?.items ?? [];
  const [view, setView] = useState<EventView>('calendar');

  const renderContent = (): JSX.Element => {
    if (isLoading) {
      return <CardGridSkeleton count={6} columns={3} />;
    }
    if (isError) {
      return (
        <EventsMessage>
          We couldn&apos;t load the events right now. Please try again shortly.
        </EventsMessage>
      );
    }
    if (events.length === 0) {
      return (
        <EventsMessage>
          No events have been published yet. Check back soon for webinars, cohort launches, and more.
        </EventsMessage>
      );
    }
    return view === 'calendar' ? <CalendarGrid events={events} /> : <EventsCardList events={events} />;
  };

  return (
    <>
      <Seo
        title="Events"
        description="Webinars, cohort launches, partner forums and community events from Impact Africa Alliance."
      />
      <PageHero
        eyebrow="Events"
        title="Events across the Alliance"
        subtitle="Webinars, cohort launches, partner forums and community gatherings — find what’s coming up and look back at where we’ve been."
        watermark="africa"
        image={heroImage}
      />
      <Section>
        <Stack direction="row" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} sx={{ mb: 4 }}>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, value) => {
              if (value) {
                setView(value as EventView);
              }
            }}
            aria-label="Event view"
          >
            <ToggleButton value="calendar" aria-label="Calendar view">
              <CalendarMonthRoundedIcon sx={{ mr: 1 }} />
              Calendar
            </ToggleButton>
            <ToggleButton value="card" aria-label="Card view">
              <ViewListRoundedIcon sx={{ mr: 1 }} />
              Card
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {renderContent()}
      </Section>
    </>
  );
};

export default Events;
