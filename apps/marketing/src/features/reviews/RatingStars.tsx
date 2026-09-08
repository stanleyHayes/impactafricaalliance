import { MIN_RATINGS_FOR_AVERAGE, type RatingSummary } from '@iaa/shared';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export const RatingStars = ({
  rating,
  size = 20,
}: {
  rating: number;
  size?: number;
}): JSX.Element => (
  <Stack direction="row" spacing={0.2} aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <StarRoundedIcon
        key={star}
        sx={{ fontSize: size, color: star <= Math.round(rating) ? 'secondary.main' : 'divider' }}
      />
    ))}
  </Stack>
);

/**
 * The headline rating, or an honest count.
 *
 * Below three ratings the average is withheld and only the count is shown —
 * one unhappy person should not be allowed to define an event forty people
 * enjoyed, and a bare "1.0" would do exactly that.
 */
export const RatingHeadline = ({ summary }: { summary: RatingSummary }): JSX.Element | null => {
  if (summary.count === 0) return null;

  const label = `${summary.count} ${summary.count === 1 ? 'rating' : 'ratings'}`;
  if (summary.average === undefined) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {label} — an average appears once there are {MIN_RATINGS_FOR_AVERAGE}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <RatingStars rating={summary.average} />
      <Box>
        <Typography component="span" sx={{ fontWeight: 800 }}>
          {summary.average.toFixed(1)}
        </Typography>
        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.75 }}>
          from {label}
        </Typography>
      </Box>
    </Stack>
  );
};
