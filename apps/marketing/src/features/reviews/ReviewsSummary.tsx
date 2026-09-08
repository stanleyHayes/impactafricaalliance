import type { RatingSummary } from '@iaa/shared';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';


import { RatingHeadline } from './RatingStars';

export const ReviewsSummary = ({ summary }: { summary: RatingSummary }): JSX.Element | null => {
  if (!summary.count) return null;
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={4}
      sx={{
        p: { xs: 3, md: 4 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 4,
        bgcolor: 'background.paper',
        alignItems: { sm: 'center' },
      }}
    >
      <Box sx={{ flex: 1, borderRight: { sm: 1 }, borderColor: { sm: 'divider' }, pr: { sm: 4 } }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontSize: '0.65rem', letterSpacing: 1.7 }}
        >
          The community&apos;s perspective
        </Typography>
        {summary.average === undefined ? (
          <RatingHeadline summary={summary} />
        ) : (
          <>
            <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mt: 1.5 }}>
              <Typography
                sx={{
                  fontSize: { xs: '3.7rem', md: '4.5rem' },
                  fontWeight: 750,
                  lineHeight: 1,
                  letterSpacing: '-0.065em',
                }}
              >
                {summary.average.toFixed(1)}
              </Typography>
              <Box>
                <Rating
                  readOnly
                  value={summary.average}
                  precision={0.1}
                  sx={{ color: '#E9BA49', fontSize: 22 }}
                />
                <Typography sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                  out of 5 · {summary.count} ratings
                </Typography>
              </Box>
            </Stack>
            <Typography
              sx={{ mt: 2, fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.6 }}
            >
              Experiences shared by our community.
            </Typography>
          </>
        )}
      </Box>
      <Stack spacing={1.4} sx={{ flex: 1 }}>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = summary.distribution[stars - 1] ?? 0;
          return (
            <Stack key={stars} direction="row" spacing={1.5} alignItems="center">
              <Typography sx={{ fontSize: '0.8rem', minWidth: 42 }}>
                {stars} {stars === 1 ? 'star' : 'stars'}
              </Typography>
              <LinearProgress
                aria-label={`${stars} ${stars === 1 ? 'star' : 'stars'}: ${count} ratings`}
                variant="determinate"
                value={(count / summary.count) * 100}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 4,
                  bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08),
                  '& .MuiLinearProgress-bar': { borderRadius: 4 },
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  minWidth: 20,
                  textAlign: 'right',
                  color: 'text.secondary',
                }}
              >
                {count}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};
