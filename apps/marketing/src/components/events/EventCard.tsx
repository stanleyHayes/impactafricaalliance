import { isRegistrationOpen, type Event } from '@iaa/shared';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { EventRegistrationDialog } from '../../features/events/EventRegistrationDialog';
import { formatEventDate, formatEventTime, formatEventType } from '../../lib/event-utils';

import { EventArtwork } from './EventArtwork';

export const EventCard = ({ event }: { event: Event }): JSX.Element => {
  const [registering, setRegistering] = useState(false);
  const canRegister = isRegistrationOpen(event, new Date());
  return (
    <Card
      variant="outlined"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 34%) minmax(0, 1fr)' },
        overflow: 'hidden',
        borderRadius: 3,
        transition: 'border-color 180ms ease',
        '&:hover': { borderColor: 'primary.main' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Box
        component={RouterLink}
        to={`/events/${event.id}`}
        aria-label={`View ${event.title}`}
        sx={{
          position: 'relative',
          display: 'block',
          minHeight: { md: 280 },
          aspectRatio: { xs: '16 / 9', md: 'auto' },
          overflow: 'hidden',
        }}
      >
        <EventArtwork src={event.image?.url} sx={{ position: 'absolute', inset: 0 }} />
        <Chip
          label={formatEventType(event.type)}
          size="small"
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            bgcolor: '#F5B800',
            color: '#0E2A22',
            fontWeight: 700,
          }}
        />
      </Box>
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            columnGap: 2,
            rowGap: 0.5,
            mb: 1,
            color: 'text.secondary',
          }}
        >
          <Typography
            variant="caption"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontWeight: 650 }}
          >
            <CalendarTodayIcon sx={{ fontSize: 16, flexShrink: 0 }} />
            {formatEventDate(event.startAt)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontWeight: 650 }}
          >
            <AccessTimeRoundedIcon sx={{ fontSize: 16, flexShrink: 0 }} />
            {formatEventTime(event.startAt)} GMT
          </Typography>
        </Box>
        <Typography
          component="h3"
          variant="h5"
          sx={{ fontSize: { xs: '1.3rem', md: '1.6rem' }, lineHeight: 1.25, mb: 1 }}
        >
          <Box
            component={RouterLink}
            to={`/events/${event.id}`}
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {event.title}
          </Box>
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0.75,
            color: 'text.secondary',
            mb: { xs: 0, md: 1.5 },
          }}
        >
          <LocationOnOutlinedIcon sx={{ fontSize: 18, mt: 0.2, flexShrink: 0 }} />
          <Typography variant="body2">{event.location}</Typography>
        </Box>
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'flex-start',
            gap: 0.75,
            color: 'text.secondary',
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 18, mt: 0.25, flexShrink: 0 }} />
          <Typography
            variant="body2"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.6,
            }}
          >
            {event.description}
          </Typography>
        </Box>
        {event.host && (
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'flex-start',
              gap: 0.75,
              color: 'text.secondary',
              mt: 1,
            }}
          >
            <PersonOutlinedIcon sx={{ fontSize: 18, mt: 0.1, flexShrink: 0 }} />
            <Typography variant="caption">
              {event.host}
              {event.hostTitle ? ` · ${event.hostTitle}` : ''}
            </Typography>
          </Box>
        )}
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}
        >
          {canRegister && (
            <Button
              variant="contained"
              onClick={() => setRegistering(true)}
              sx={{ fontWeight: 750, display: { xs: 'none', md: 'inline-flex' } }}
            >
              Register {event.admission ? `— ${event.admission}` : 'free'}
            </Button>
          )}
          <Button
            component={RouterLink}
            to={`/events/${event.id}`}
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{ px: { xs: 0, md: 1.5 } }}
          >
            View event
          </Button>
        </Stack>
      </Box>
      {canRegister && (
        <EventRegistrationDialog
          event={event}
          open={registering}
          onClose={() => setRegistering(false)}
        />
      )}
    </Card>
  );
};
