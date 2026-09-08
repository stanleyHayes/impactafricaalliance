import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

export const EventReviewsEmptyState = (): JSX.Element => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 0.8fr) 1.6fr' },
      overflow: 'hidden',
      border: 1,
      borderColor: 'divider',
      borderRadius: 5,
      bgcolor: 'background.paper',
    }}
  >
    <Box
      aria-hidden="true"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: { xs: 150, md: 270 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      <FormatQuoteRoundedIcon
        sx={{ position: 'absolute', fontSize: 240, right: -35, bottom: -70, opacity: 0.1 }}
      />
      <Box
        sx={{
          width: { xs: 80, md: 112 },
          height: { xs: 72, md: 100 },
          display: 'grid',
          placeItems: 'center',
          border: '2px solid',
          borderColor: 'currentColor',
          borderRadius: '24px 24px 24px 4px',
          transform: 'rotate(-8deg)',
          boxShadow: (theme) => `10px 10px 0 ${alpha(theme.palette.primary.contrastText, 0.12)}`,
        }}
      >
        <FormatQuoteRoundedIcon sx={{ fontSize: { xs: 48, md: 64 } }} />
      </Box>
    </Box>
    <Box sx={{ p: { xs: 3, sm: 4, md: 5 }, alignSelf: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: 2 }}>
        <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 17 }} />
        <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
          The conversation is open
        </Typography>
      </Box>
      <Typography
        component="h3"
        sx={{
          fontSize: { xs: '1.6rem', md: '2rem' },
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.025em',
          maxWidth: 420,
          textWrap: 'balance',
        }}
      >
        Be the first to share your experience.
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 480, fontSize: '0.95rem' }}>
        No reviews have been published for this event yet. A memorable moment, a new connection,
        something you learned — we’d love to hear what stayed with you.
      </Typography>
    </Box>
  </Box>
);
