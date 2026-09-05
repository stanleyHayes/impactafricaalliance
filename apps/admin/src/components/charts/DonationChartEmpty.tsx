import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

interface DonationChartEmptyProps {
  hasHistory: boolean;
  needsReview: boolean;
}

/** A real empty state, without illustrative bars that could be mistaken for donation data. */
export const DonationChartEmpty = ({
  hasHistory,
  needsReview,
}: DonationChartEmptyProps): JSX.Element => (
  <Box
    component="section"
    aria-label="Donation chart empty state"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr' },
      alignItems: 'center',
      gap: { xs: 1.5, sm: 2.5 },
      p: { xs: 2, sm: 2.5 },
      borderRadius: 3,
      border: 1,
      borderColor: 'divider',
      bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.045),
    }}
  >
    <VolunteerActivismOutlinedIcon
      aria-hidden="true"
      sx={{
        position: 'absolute',
        right: -25,
        bottom: -30,
        fontSize: 180,
        opacity: 0.045,
        color: 'text.secondary',
        transform: 'rotate(-12deg)',
        pointerEvents: 'none',
      }}
    />
    <Box
      component="svg"
      viewBox="0 0 112 112"
      fill="none"
      aria-hidden="true"
      focusable="false"
      sx={{
        width: { xs: 64, sm: 92 },
        height: 'auto',
        position: 'relative',
        color: 'text.secondary',
      }}
    >
      <circle cx="56" cy="56" r="51" fill="currentColor" fillOpacity="0.045" />
      <rect
        x="30"
        y="35"
        width="55"
        height="60"
        rx="8"
        transform="rotate(-9 30 35)"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <rect
        x="25"
        y="28"
        width="57"
        height="66"
        rx="8"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="1.5"
      />
      <path
        d="M38 74h31M38 82h19"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Box
        component="g"
        sx={{ color: (theme) => (theme.palette.mode === 'dark' ? '#E7C878' : '#86631D') }}
      >
        <path
          d="M53.5 62 40 49a8 8 0 0 1 13.5-9A8 8 0 0 1 67 49Z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M90 16v12M84 22h12M17 56v8M13 60h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="88" cy="75" r="3" fill="currentColor" fillOpacity="0.6" />
      </Box>
    </Box>
    <Box sx={{ position: 'relative', minWidth: 0 }}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
        {hasHistory ? 'No completed gifts in this period' : 'No completed donations yet'}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 0.75, maxWidth: 390, lineHeight: 1.6 }}
      >
        {needsReview
          ? 'Review pending or unsuccessful payments in the donations list. This chart shows completed gifts from the last six months.'
          : 'Completed donations from the last six months will appear here. There’s nothing to chart just yet.'}
      </Typography>
      <Button
        component={RouterLink}
        to="/donations"
        size="small"
        color="inherit"
        endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />}
        sx={{
          mt: 1,
          px: 0,
          minHeight: 36,
          color: 'text.primary',
          '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
        }}
      >
        {needsReview ? 'Review donations' : 'View donations'}
      </Button>
    </Box>
  </Box>
);
