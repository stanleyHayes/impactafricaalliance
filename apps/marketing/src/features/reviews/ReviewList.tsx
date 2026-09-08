import type { PublicReview } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';

const formatted = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  );

const ReviewCard = ({ review, index }: { review: PublicReview; index: number }): JSX.Element => (
  <Box
    component="article"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      p: { xs: 2.5, md: 3.5 },
      border: 1,
      borderColor: 'divider',
      borderRadius: 3,
      bgcolor: ['#D2EBDC', '#F4E9BE', '#DBE7F2'][index % 3],
      color: '#173C2D',
      minHeight: 310,
      '& .MuiTypography-root': { color: 'inherit' },
    }}
  >
    <FormatQuoteRoundedIcon
      aria-hidden
      sx={{
        position: 'absolute',
        right: 20,
        top: 62,
        fontSize: 86,
        color: '#173C2D',
        opacity: 0.08,
        pointerEvents: 'none',
      }}
    />
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar
        aria-hidden
        sx={{
          width: 40,
          height: 40,
          bgcolor: alpha('#173C2D', 0.1),
          color: '#173C2D',
          fontWeight: 700,
          fontSize: '0.85rem',
        }}
      >
        {review.displayName
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', overflowWrap: 'anywhere' }}>
          {review.displayName}
        </Typography>
        {review.role && (
          <Typography
            color="text.secondary"
            sx={{ fontSize: '0.75rem', mt: 0.25, overflowWrap: 'anywhere' }}
          >
            {review.role}
          </Typography>
        )}
      </Box>
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
      <Typography
        sx={{
          position: 'relative',
          mt: 2.5,
          lineHeight: 1.8,
          fontSize: { xs: '0.95rem', md: '1rem' },
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {review.comment}
      </Typography>
    )}
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={1}
      sx={{ mt: 2.5, pt: 2, borderTop: 1, borderColor: 'divider' }}
    >
      <Rating
        readOnly
        value={review.rating}
        size="small"
        sx={{ color: '#856100', '& .MuiRating-iconEmpty': { color: 'rgba(23,60,45,0.2)' } }}
      />
      <Typography
        component="time"
        dateTime={review.submittedAt}
        sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
      >
        {formatted(review.submittedAt)}
      </Typography>
    </Stack>
  </Box>
);

const ReviewCarousel = ({ reviews }: { reviews: PublicReview[] }): JSX.Element => {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const move = (index: number, keyboard = false): void => {
    const element = track.current;
    if (!element) return;
    const target = Math.max(0, Math.min(reviews.length - 1, index));
    const slide = element.children[target] as HTMLElement;
    element.scrollTo({
      left: slide.offsetLeft,
      behavior: reduceMotion || keyboard ? 'instant' : 'smooth',
    });
  };
  return (
    <Box role="region" aria-roledescription="carousel" aria-label="Community reviews">
      <Box
        ref={track}
        tabIndex={0}
        aria-label="Review cards. Use left and right arrow keys to browse."
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            move(active + (event.key === 'ArrowRight' ? 1 : -1), true);
          }
        }}
        onScroll={() => {
          const element = track.current;
          if (element)
            setActive(
              Math.max(
                0,
                Math.min(
                  reviews.length - 1,
                  Math.round(element.scrollLeft / (element.clientWidth + 16)),
                ),
              ),
            );
        }}
        sx={{
          position: 'relative',
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          overscrollBehaviorX: 'contain',
          borderRadius: 3,
          scrollbarWidth: 'thin',
          pb: 1,
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 3,
          },
        }}
      >
        {reviews.map((review, index) => (
          <Box
            key={review.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${reviews.length}`}
            sx={{ flex: '0 0 100%', minWidth: 0, scrollSnapAlign: 'start' }}
          >
            <ReviewCard review={review} index={index} />
          </Box>
        ))}
      </Box>
      {reviews.length > 1 && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
          <Typography aria-live="polite" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            Review {active + 1} of {reviews.length} in this batch
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton
              aria-label="Previous review"
              disabled={active === 0}
              onClick={() => move(active - 1)}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="Next review"
              disabled={active === reviews.length - 1}
              onClick={() => move(active + 1)}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <ArrowForwardRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      )}
    </Box>
  );
};

export const ReviewList = ({ reviews }: { reviews: PublicReview[] }): JSX.Element | null => {
  if (reviews.length === 0) return null;
  return <ReviewCarousel key={reviews.map((review) => review.id).join(',')} reviews={reviews} />;
};
