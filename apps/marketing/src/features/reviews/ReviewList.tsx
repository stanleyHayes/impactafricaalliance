import type { PublicReview } from '@iaa/shared';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { RatingStars } from './RatingStars';

const formatted = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  );

const ReviewCard = ({ review }: { review: PublicReview }): JSX.Element => (
  <Box
    component="article"
    sx={{ p: { xs: 2.5, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3 }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
      <RatingStars rating={review.rating} size={18} />
      {review.attended && (
        <Chip
          size="small"
          variant="outlined"
          color="success"
          icon={<VerifiedRoundedIcon />}
          label="Attended"
        />
      )}
    </Stack>
    {review.comment && (
      <Typography sx={{ mt: 1.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {review.comment}
      </Typography>
    )}
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {review.displayName}
      </Box>
      {review.role ? ` · ${review.role}` : ''} · {formatted(review.submittedAt)}
    </Typography>
  </Box>
);

export const ReviewList = ({ reviews }: { reviews: PublicReview[] }): JSX.Element | null => {
  if (reviews.length === 0) return null;
  return (
    <Stack spacing={2}>
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </Stack>
  );
};
