import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Watermark } from '../Watermark';

/** A calendar and search lens, drawn in the same muted tones as the results panel. */
const CalendarSearchArtwork = (): JSX.Element => (
  <Box
    component="svg"
    viewBox="0 0 160 144"
    fill="none"
    aria-hidden="true"
    focusable="false"
    sx={{ display: 'block', width: { xs: 72, sm: 120 }, color: 'text.secondary' }}
  >
    <rect
      x="21"
      y="27"
      width="104"
      height="99"
      rx="12"
      transform="rotate(-9 21 27)"
      fill="currentColor"
      fillOpacity="0.06"
      stroke="currentColor"
      strokeOpacity="0.18"
    />
    <Box component="g" sx={(theme) => ({ fill: theme.palette.background.paper })}>
      <rect x="30" y="22" width="104" height="99" rx="12" />
    </Box>
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="30" y="22" width="104" height="99" rx="12" strokeOpacity="0.55" />
      <path d="M30 49h104M54 14v17M110 14v17" strokeOpacity="0.7" />
    </g>
    <g fill="currentColor" fillOpacity="0.25">
      <rect x="47" y="63" width="12" height="10" rx="3" />
      <rect x="73" y="63" width="12" height="10" rx="3" />
      <rect x="99" y="63" width="12" height="10" rx="3" />
      <rect x="47" y="87" width="12" height="10" rx="3" />
      <rect x="73" y="87" width="12" height="10" rx="3" />
    </g>
    <Box
      component="g"
      sx={(theme) => ({ color: 'secondary.main', fill: theme.palette.background.paper })}
    >
      <circle cx="119" cy="107" r="22" />
      <circle cx="119" cy="107" r="22" fill="currentColor" fillOpacity="0.08" />
      <circle cx="119" cy="107" r="22" stroke="currentColor" strokeWidth="2.5" />
      <path d="m136 124 13 13" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </Box>
    <path d="M111 107h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </Box>
);

interface EventEmptyStateProps {
  hasEvents: boolean;
  onReset?: () => void;
}

export const EventEmptyState = ({ hasEvents, onReset }: EventEmptyStateProps): JSX.Element => (
  <Box
    component="section"
    aria-label="No event results"
    sx={{
      position: 'relative',
      isolation: 'isolate',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: 'auto 1fr', md: 'auto 1fr auto' },
      alignItems: 'center',
      columnGap: { sm: 3, md: 4 },
      rowGap: 2,
      p: { xs: 2.5, sm: 3, md: 4 },
      border: 1,
      borderColor: 'divider',
      borderRadius: 4,
      bgcolor: (theme) =>
        theme.palette.mode === 'dark'
          ? alpha(theme.palette.text.secondary, 0.055)
          : alpha(theme.palette.common.black, 0.025),
      '& > :not([aria-hidden])': { position: 'relative', zIndex: 1 },
    }}
  >
    <Watermark
      variant="radar"
      size={300}
      opacity={0.055}
      sx={{ color: 'text.primary', right: -60, bottom: -100, animation: 'none' }}
    />
    <Box aria-hidden="true" sx={{ gridRow: { sm: onReset ? 'span 2' : 'auto', md: 'auto' } }}>
      <CalendarSearchArtwork />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="h5"
        component="h3"
        sx={{ fontSize: { xs: '1.35rem', md: '1.65rem' }, lineHeight: 1.3 }}
      >
        {hasEvents ? 'No events match your filters.' : 'Nothing on the calendar yet.'}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 460, fontSize: '0.95rem' }}>
        {hasEvents
          ? 'Try a different topic, event type or date.'
          : 'Check back for workshops, conversations and gatherings from the Alliance.'}
      </Typography>
    </Box>
    {onReset && (
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<RestartAltRoundedIcon />}
        onClick={onReset}
        sx={{
          justifySelf: 'start',
          gridColumn: { sm: 2, md: 'auto' },
          whiteSpace: 'nowrap',
          color: 'text.primary',
          borderColor: (theme) => alpha(theme.palette.text.secondary, 0.4),
          bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.07),
          '&:hover': {
            borderColor: 'text.secondary',
            bgcolor: (theme) => alpha(theme.palette.text.secondary, 0.14),
          },
        }}
      >
        Clear filters
      </Button>
    )}
  </Box>
);
