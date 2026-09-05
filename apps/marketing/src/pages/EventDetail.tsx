import { isRegistrationOpen, brandColors, type Event } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { EventArtwork } from '../components/events/EventArtwork';
import { Seo } from '../components/Seo';
import { PageSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { EventRegistrationDialog } from '../features/events/EventRegistrationDialog';
import { useEvent } from '../lib/content-hooks';
import { formatEventDate, formatEventTime, formatEventType } from '../lib/event-utils';

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: SvgIconComponent;
  label: string;
  value: string;
}): JSX.Element => (
  <Stack direction="row" spacing={1.5} alignItems="flex-start">
    <Icon sx={{ mt: 0.25, color: brandColors.gold, fontSize: 20 }} />
    <Box>
      <Typography
        sx={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ color: 'common.white', fontWeight: 650 }}>{value}</Typography>
    </Box>
  </Stack>
);

const eventSchedule = (event: Event): string => {
  const start = `${formatEventDate(event.startAt)} · ${formatEventTime(event.startAt)} GMT`;
  return event.endAt
    ? `${start} — ${formatEventDate(event.endAt)} · ${formatEventTime(event.endAt)} GMT`
    : start;
};

const EventBody = ({ event }: { event: Event }): JSX.Element => {
  const [registering, setRegistering] = useState(false);
  const canRegister = isRegistrationOpen(event, new Date());

  return (
    <>
      <Seo
        title={event.title}
        description={event.description.slice(0, 180)}
        image={event.image?.url ?? IMAGES.teamArtwork}
        type="article"
      />

      <Box
        component="header"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 7, md: 11 },
          color: 'common.white',
          bgcolor: brandColors.deepForest,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <Container maxWidth="lg">
          <Button
            component={RouterLink}
            to="/events"
            startIcon={<ArrowBackRoundedIcon />}
            sx={{ mb: 3, color: 'rgba(255,255,255,0.78)', fontWeight: 700 }}
          >
            All events
          </Button>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
              gap: { xs: 4, md: 6 },
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                borderRadius: 4,
                overflow: 'hidden',
                aspectRatio: '4 / 5',
                maxHeight: { xs: 420, md: 650 },
              }}
            >
              <EventArtwork src={event.image?.url} />
              <Box
                sx={{
                  position: 'absolute',
                  left: 24,
                  bottom: 24,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: brandColors.deepForest,
                }}
              >
                <Typography variant="overline" sx={{ color: brandColors.gold }}>
                  Meet. Learn. Build.
                </Typography>
                <Typography sx={{ color: 'white', fontWeight: 650 }}>
                  Impact Africa Alliance
                </Typography>
              </Box>
            </Box>
            <Box>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  size="small"
                  label={formatEventType(event.type)}
                  sx={{
                    bgcolor: alpha(brandColors.gold, 0.9),
                    color: brandColors.charcoalBlack,
                    fontWeight: 750,
                  }}
                />
              </Stack>

              <Typography
                variant="h1"
                sx={{ maxWidth: 880, fontSize: { xs: '2rem', md: '2.8rem' }, lineHeight: 1.1 }}
              >
                {event.title}
              </Typography>

              <Stack
                direction="column"
                spacing={{ xs: 2, sm: 4 }}
                sx={{ mt: 4, flexWrap: 'wrap', rowGap: 2 }}
              >
                <DetailRow icon={AccessTimeRoundedIcon} label="When" value={eventSchedule(event)} />
                <DetailRow icon={PlaceRoundedIcon} label="Where" value={event.location} />
                {event.host && (
                  <DetailRow
                    icon={PersonRoundedIcon}
                    label="Hosted by"
                    value={event.hostTitle ? `${event.host} — ${event.hostTitle}` : event.host}
                  />
                )}
                {event.admission && (
                  <DetailRow
                    icon={ConfirmationNumberRoundedIcon}
                    label="Admission"
                    value={event.admission}
                  />
                )}
              </Stack>

              {canRegister && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setRegistering(true)}
                  sx={{ mt: 4.5, px: 4, fontWeight: 800 }}
                >
                  Register {event.admission ? `— ${event.admission}` : 'free'}
                </Button>
              )}
              {!canRegister && (
                <Typography sx={{ mt: 3, color: 'rgba(255,255,255,0.7)' }}>
                  {Date.parse(event.endAt ?? event.startAt) < Date.now()
                    ? 'This event has ended.'
                    : 'Registration is not currently open.'}
                </Typography>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 } }}>
        <Typography variant="overline" color="text.secondary">
          The gathering
        </Typography>
        <Typography variant="h3" component="h2" sx={{ mb: 4 }}>
          About this event
        </Typography>
        <Stack spacing={2.5}>
          {event.description
            .split(/\n{2,}|\n/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph) => (
              <Typography
                key={paragraph.slice(0, 40)}
                color="text.secondary"
                sx={{ fontSize: '1.02rem', lineHeight: 1.85 }}
              >
                {paragraph}
              </Typography>
            ))}
        </Stack>

        {canRegister && (
          <>
            <Divider sx={{ my: 5 }} />
            <Stack spacing={2} alignItems="flex-start">
              <Typography variant="h5">Join this session</Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                Complete the registration form to reserve your place in this session.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => setRegistering(true)}
                sx={{ mt: 1, px: 4, fontWeight: 800 }}
              >
                Register {event.admission ? `— ${event.admission}` : 'free'}
              </Button>
            </Stack>
          </>
        )}
      </Container>

      <EventRegistrationDialog
        event={event}
        open={registering}
        onClose={() => setRegistering(false)}
      />
    </>
  );
};

/** Public page for a single event, so each one has a shareable address. */
const EventDetail = (): JSX.Element => {
  const { eventId } = useParams();
  const { data: event, isLoading, isError } = useEvent(eventId ?? '');

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError || !event) {
    return (
      <Container maxWidth="sm" sx={{ py: 12 }}>
        <Seo title="Event not found" noindex />
        <Alert severity="info" sx={{ mb: 3 }}>
          We couldn&apos;t find that event. It may have finished or been unpublished.
        </Alert>
        <Button component={RouterLink} to="/events" variant="contained" sx={{ fontWeight: 750 }}>
          See all events
        </Button>
      </Container>
    );
  }

  return <EventBody event={event} />;
};

export default EventDetail;
