import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { Seo } from '../../components/Seo';

export const EventUnavailable = ({
  temporary,
  retrying,
  onRetry,
}: {
  temporary: boolean;
  retrying: boolean;
  onRetry: () => void;
}): JSX.Element => (
  <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
    <Seo title={temporary ? 'Unable to load event' : 'Event unavailable'} noindex />
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' },
        border: 1,
        borderColor: 'divider',
        borderRadius: 5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        aria-hidden="true"
        spacing={3}
        alignItems="center"
        justifyContent="center"
        sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: { xs: 4, md: 6 } }}
      >
        <Box
          sx={{
            border: '2px solid',
            borderRadius: 4,
            width: { xs: 140, md: 200 },
            transform: 'rotate(-6deg)',
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              py: 1.5,
              borderBottom: '2px dashed',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
            }}
          >
            MEET. LEARN. BUILD.
          </Typography>
          <EventBusyRoundedIcon sx={{ fontSize: { xs: 58, md: 88 }, my: 3 }} />
        </Box>
      </Stack>
      <Box sx={{ p: { xs: 3, sm: 5, md: 7 } }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ fontSize: '0.7rem', letterSpacing: '0.14em', fontWeight: 700 }}
        >
          Impact Africa Alliance events
        </Typography>
        <Typography
          variant="h2"
          component="h1"
          sx={{ mt: 2, fontSize: { xs: '2.2rem', md: '3rem' }, textWrap: 'balance' }}
        >
          {temporary ? 'We couldn’t load this event.' : 'This event isn’t available.'}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2.5, maxWidth: 470 }}>
          {temporary
            ? 'There was a problem connecting. Try again to load the event details, or explore our other events.'
            : 'The link may be out of date, or the event may no longer be published. Explore our events to find another opportunity to meet, learn and connect.'}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
          <Button
            component={RouterLink}
            to="/events"
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
          >
            Browse events
          </Button>
          {temporary && (
            <Button
              variant="outlined"
              onClick={onRetry}
              disabled={retrying}
              startIcon={<RefreshRoundedIcon />}
            >
              {retrying ? 'Trying again…' : 'Try again'}
            </Button>
          )}
        </Stack>
        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
            Already registered or need a hand?
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: '0.875rem' }}>
            Check your confirmation email for event details, or get in touch with our team.
          </Typography>
          <Button
            component={RouterLink}
            to="/contact"
            size="small"
            sx={{ mt: 1, px: 0, color: 'text.primary' }}
            endIcon={<ArrowForwardRoundedIcon />}
          >
            Contact the team
          </Button>
        </Box>
      </Box>
    </Box>
  </Container>
);
