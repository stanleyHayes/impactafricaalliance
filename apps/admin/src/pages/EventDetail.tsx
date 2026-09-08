import type { Event, RatingSummary } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../components/EmptyState';
import { EventImage } from '../components/events/EventImage';
import { EventQrDialog } from '../components/events/EventQrDialog';
import { InformationItem } from '../components/InformationItem';
import { api } from '../lib/api-client';

import { ReviewQueue } from './Reviews';

const formatDate = (value?: string): string =>
  value
    ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not set';

const Detail = InformationItem;

const Section = ({ title, children }: { title: string; children: ReactNode }): JSX.Element => {
  const icons = [
    { match: /question/i, icon: <QuestionAnswerOutlinedIcon /> },
    { match: /schedule/i, icon: <CalendarMonthRoundedIcon /> },
    { match: /registration/i, icon: <PeopleOutlineRoundedIcon /> },
    { match: /rating|moderation/i, icon: <RateReviewRoundedIcon /> },
  ];
  const icon = icons.find((entry) => entry.match.test(title))?.icon ?? <DescriptionOutlinedIcon />;
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: { xs: 2.5, md: 3.5 },
          py: 2.5,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.045),
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            right: 20,
            top: -22,
            color: (theme) => alpha(theme.palette.text.primary, 0.06),
            pointerEvents: 'none',
            '& svg': { fontSize: 110 },
          }}
        >
          {icon}
        </Box>
        <Box
          aria-hidden
          sx={{
            display: 'grid',
            placeItems: 'center',
            p: 1,
            borderRadius: 1.5,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          }}
        >
          {icon}
        </Box>
        <Typography component="h2" variant="h6" sx={{ position: 'relative' }}>
          {title}
        </Typography>
      </Stack>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>{children}</Box>
    </Card>
  );
};

const EventRegistration = ({ event }: { event: Event }): JSX.Element => (
  <Section title="Registration & joining">
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
      <Detail label="Registration">{event.registrationEnabled ? 'Enabled' : 'Disabled'}</Detail>
      <Detail label="Capacity">{event.capacity ? `${event.capacity} places` : 'Unlimited'}</Detail>
      <Detail label="Admission">{event.admission || 'Not specified'}</Detail>
      <Detail label="Registration deadline">
        {event.registrationClosesAt
          ? formatDate(event.registrationClosesAt)
          : `At event start · ${formatDate(event.startAt)}`}
      </Detail>
    </Box>
    <Box
      sx={{
        mt: 3,
        p: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
        borderRadius: 2,
      }}
    >
      <Detail label="Private joining link">
        {event.meetingUrl ? (
          <Link href={event.meetingUrl} target="_blank" rel="noopener noreferrer">
            {event.meetingUrl}
          </Link>
        ) : (
          'No joining link added'
        )}
      </Detail>
      <Typography variant="caption" color="text.secondary">
        Shared with registered attendees; never displayed on the public event page.
      </Typography>
    </Box>
  </Section>
);

const EventQuestions = ({ event }: { event: Event }): JSX.Element => (
  <Section title={`Event questions · ${event.questions.length}`}>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      These questions appear alongside the standard registration questions.
    </Typography>
    {event.questions.length === 0 ? (
      <Typography color="text.secondary">No additional questions for this event.</Typography>
    ) : (
      <Stack spacing={2}>
        {event.questions.map((question, index) => (
          <Box
            key={question.id}
            sx={{
              border: 1,
              borderColor: 'divider',
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.035),
            }}
          >
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
              <Box
                aria-hidden
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  fontWeight: 800,
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </Box>
              <Typography sx={{ fontWeight: 700, flex: '1 1 200px', overflowWrap: 'anywhere' }}>
                {question.label}
              </Typography>
              <Chip size="small" label={question.required ? 'Required' : 'Optional'} />
              <Chip size="small" variant="outlined" label={question.type.replaceAll('-', ' ')} />
            </Stack>
            {question.helpText && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {question.helpText}
              </Typography>
            )}
            {question.options.length > 0 && (
              <Box component="ul" sx={{ pl: 2.5, mb: 0 }}>
                {question.options.map((option, optionIndex) => (
                  <li key={`${optionIndex}-${option}`}>
                    <Typography variant="body2">{option}</Typography>
                  </li>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Stack>
    )}
  </Section>
);

const EventRatings = ({ eventId }: { eventId: string }): JSX.Element => {
  const query = useQuery({
    queryKey: ['reviews', 'summary', eventId],
    queryFn: () => api.get<RatingSummary>(`/admin/reviews/events/${eventId}/summary`),
  });
  if (query.isPending) return <Skeleton variant="rounded" height={180} />;
  if (query.isError)
    return (
      <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>
        Event ratings could not be loaded.
      </Alert>
    );
  const summary = query.data;
  return (
    <Section title="Published ratings">
      {summary.count === 0 ? (
        <EmptyState
          compact
          icon={<RateReviewRoundedIcon />}
          title="No published ratings yet"
          description="Approve attendee reviews below to build this event’s rating summary. Pending and rejected reviews are excluded."
        />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' },
            gap: 4,
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: '3rem', fontWeight: 750, lineHeight: 1.1 }}>
              {summary.average ?? '—'}
              <Box component="span" sx={{ fontSize: '1rem', color: 'text.secondary' }}>
                {' '}
                / 5
              </Box>
            </Typography>
            {summary.average !== undefined && (
              <Rating readOnly precision={0.1} value={summary.average} sx={{ my: 1 }} />
            )}
            <Typography variant="body2" color="text.secondary">
              {summary.count} published ratings
            </Typography>
            {summary.average === undefined && (
              <Typography variant="caption" color="text.secondary">
                The average appears after 3 published ratings.
              </Typography>
            )}
          </Box>
          <Stack spacing={1}>
            {[5, 4, 3, 2, 1].map((star) => (
              <Stack key={star} direction="row" spacing={1.5} alignItems="center">
                <Typography variant="caption" sx={{ width: 45 }}>
                  {star} stars
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: 8,
                    bgcolor: 'action.hover',
                    borderRadius: 9,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${((summary.distribution[star - 1] ?? 0) / summary.count) * 100}%`,
                      bgcolor: 'primary.main',
                    }}
                  />
                </Box>
                <Typography variant="caption">{summary.distribution[star - 1] ?? 0}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Section>
  );
};

const EventOverview = ({ event, canManage }: { event: Event; canManage: boolean }): JSX.Element => {
  const [showQr, setShowQr] = useState(false);
  return (
    <Stack spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ height: { xs: 210, md: 330 } }}>
          <EventImage src={event.image?.url} />
        </Box>
        <Box sx={{ p: { xs: 2.5, md: 4 }, position: 'relative', overflow: 'hidden' }}>
          <CalendarMonthRoundedIcon
            aria-hidden
            sx={{
              position: 'absolute',
              right: -15,
              bottom: -30,
              fontSize: 210,
              opacity: 0.085,
              pointerEvents: 'none',
            }}
          />
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
            <Chip size="small" label={event.type.replaceAll('-', ' ')} />
            <Chip
              size="small"
              color={event.status === 'published' ? 'success' : 'warning'}
              label={event.status}
            />
          </Stack>
          <Typography
            component="h1"
            variant="h3"
            sx={{
              fontSize: { xs: '1.7rem', md: '2.4rem' },
              maxWidth: 900,
              mb: 2,
              overflowWrap: 'anywhere',
            }}
          >
            {event.title}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              mt: 3,
              maxWidth: 800,
              position: 'relative',
            }}
          >
            <InformationItem label="Event date">{formatDate(event.startAt)}</InformationItem>
            <InformationItem label="Location">{event.location}</InformationItem>
          </Box>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 3 }}>
            {canManage && (
              <Button
                component={RouterLink}
                to={`/events/${event.id}/edit`}
                variant="contained"
                startIcon={<EditOutlinedIcon />}
              >
                Edit event
              </Button>
            )}
            {canManage && (
              <Button component="a" href="#reviews" startIcon={<RateReviewRoundedIcon />}>
                Reviews & ratings
              </Button>
            )}
            <Button onClick={() => setShowQr(true)} startIcon={<QrCode2Icon />}>
              Event QR code
            </Button>
          </Stack>
        </Box>
      </Card>
      <Section title="About this event">
        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.8 }}>
          {event.description}
        </Typography>
      </Section>
      <Section title="Schedule & people">
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
          <Detail label="Starts">{formatDate(event.startAt)}</Detail>
          <Detail label="Ends">{formatDate(event.endAt)}</Detail>
          <Detail label="Venue">{event.location}</Detail>
          <Detail label="Host / speaker">
            {event.host || 'Not specified'}
            {event.hostTitle && (
              <Typography variant="body2" color="text.secondary">
                {event.hostTitle}
              </Typography>
            )}
          </Detail>
        </Box>
      </Section>
      <EventRegistration event={event} />
      <EventQuestions event={event} />
      {canManage && (
        <Box id="reviews" sx={{ scrollMarginTop: 100 }}>
          <Stack spacing={3}>
            <EventRatings eventId={event.id} />
            <Section title="Review moderation">
              <ReviewQueue eventId={event.id} />
            </Section>
          </Stack>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary">
        Created {formatDate(event.createdAt)} · Updated {formatDate(event.updatedAt)}
      </Typography>
      <EventQrDialog event={event} open={showQr} onClose={() => setShowQr(false)} />
    </Stack>
  );
};

const EventDetail = (): JSX.Element => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => api.get<Event>(`/admin/events/${eventId}`),
    enabled: Boolean(eventId),
  });
  const canManage = user?.role === 'admin' || user?.role === 'editor';
  return (
    <>
      <Button
        component={RouterLink}
        to="/events"
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ mb: 2 }}
      >
        Back to events
      </Button>
      {query.isPending && (
        <Stack spacing={3}>
          <Skeleton variant="rounded" height={360} />
          <Skeleton variant="rounded" height={180} />
        </Stack>
      )}
      {query.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        >
          {query.error.message || 'This event could not be loaded.'}
        </Alert>
      )}
      {query.data && <EventOverview key={query.data.id} event={query.data} canManage={canManage} />}
    </>
  );
};
export default EventDetail;
