import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import MarkEmailUnreadRoundedIcon from '@mui/icons-material/MarkEmailUnreadRounded';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { useNewSubmissionCounts } from '../lib/admin-hooks';

/** Each type links to the inbox that already filters to it. */
const BREAKDOWN = [
  { type: 'partner', label: 'partner', to: '/submissions/partners', Icon: HandshakeOutlinedIcon },
  { type: 'volunteer', label: 'mentor', to: '/submissions/mentors', Icon: VolunteerActivismIcon },
  { type: 'contact', label: 'contact', to: '/submissions/contact', Icon: MarkEmailUnreadRoundedIcon },
  { type: 'job', label: 'application', to: '/submissions/applications', Icon: MarkEmailUnreadRoundedIcon },
] as const;

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

/**
 * Dashboard banner for unread submissions.
 *
 * Deliberately not dismissible: it disappears by reading the submissions, which
 * is the action it is asking for. A dismiss control would let real enquiries be
 * hidden without being answered.
 *
 * Renders nothing when the inbox is clear, so a quiet day stays quiet.
 */
export const NewSubmissionsBanner = (): JSX.Element | null => {
  const { data } = useNewSubmissionCounts();
  const total = data?.total ?? 0;

  if (total === 0) {
    return null;
  }

  const breakdown = BREAKDOWN.filter(({ type }) => (data?.byType[type] ?? 0) > 0);

  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
        mb: 3,
        p: { xs: 2, sm: 2.5 },
        border: 1,
        borderColor: (theme) => alpha(theme.palette.warning.main, 0.35),
        borderRadius: 2.5,
        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
      }}
    >
      <Box
        sx={{
          display: 'grid',
          flexShrink: 0,
          width: 42,
          height: 42,
          placeItems: 'center',
          borderRadius: 2,
          bgcolor: 'warning.main',
          color: 'common.black',
        }}
      >
        <MarkEmailUnreadRoundedIcon />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 750 }}>
          {plural(total, 'new submission')} waiting
        </Typography>
        {breakdown.length > 0 && (
          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
            {breakdown.map(({ type, label, to, Icon }) => (
              <Chip
                key={type}
                component={RouterLink}
                to={to}
                clickable
                size="small"
                icon={<Icon sx={{ fontSize: 16 }} />}
                label={plural(data?.byType[type] ?? 0, label)}
                sx={{ fontWeight: 650 }}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Button
        component={RouterLink}
        to="/submissions"
        variant="contained"
        color="warning"
        endIcon={<ArrowForwardRoundedIcon />}
        sx={{ flexShrink: 0, fontWeight: 750 }}
      >
        Review
      </Button>
    </Box>
  );
};
