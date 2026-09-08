import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { apiPost } from '../../lib/api-client';

const ratingLabels = ['Choose a rating', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export const ReviewForm = (): JSX.Element => {
  const [hoverRating, setHoverRating] = useState(-1);
  const [rating, setRating] = useState<number | null>(null);
  const [form, setForm] = useState({ displayName: '', email: '', role: '', comment: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const submit = async (): Promise<void> => {
    if (state === 'busy') return;
    if (rating === null) {
      setError('Choose a rating first.');
      return;
    }
    setState('busy');
    setError('');
    try {
      await apiPost('/reviews/organisation', {
        rating,
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        role: form.role.trim() || undefined,
        comment: form.comment.trim() || undefined,
        consent: true,
      });
      setState('sent');
    } catch (cause) {
      setError((cause as Error).message || 'That could not be sent.');
      setState('idle');
    }
  };

  if (state === 'sent') {
    return (
      <Alert severity="success">
        Check your email — we have sent a link to confirm it is you. Nothing is published until you
        click it, and until someone here has read it.
      </Alert>
    );
  }

  return (
    <Box
      component="form"
      id="review-form"
      tabIndex={-1}
      aria-labelledby="review-form-title"
      aria-busy={state === 'busy'}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 4,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        scrollMarginTop: 112,
        boxShadow: '0 20px 60px -40px rgba(0,0,0,0.3)',
      }}
    >
      <Box
        sx={{
          px: { xs: 3, sm: 4 },
          pt: 3.5,
          pb: 3,
          borderBottom: 1,
          borderColor: 'divider',
          background: (theme) =>
            `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <RateReviewOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography
            variant="overline"
            sx={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'text.secondary' }}
          >
            Your voice matters
          </Typography>
        </Stack>
        <Typography
          id="review-form-title"
          component="h2"
          sx={{
            fontWeight: 750,
            fontSize: { xs: '1.7rem', sm: '1.9rem' },
            letterSpacing: '-0.04em',
            lineHeight: 1.15,
          }}
        >
          Share your experience.
        </Typography>
        <Typography sx={{ mt: 1.3, color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.65 }}>
          The moments that mattered. The things we could do better. We’re here to listen.
        </Typography>
      </Box>

      <Box
        component="fieldset"
        disabled={state === 'busy'}
        sx={{
          m: 0,
          border: 0,
          minWidth: 0,
          p: { xs: 3, sm: 4 },
          '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.9rem' },
          '& .MuiInputLabel-root': { fontSize: '0.9rem' },
        }}
      >
        <Box sx={{ textAlign: 'center', pb: 3.5 }}>
          <Typography
            component="legend"
            id="experience-rating-label"
            sx={{ width: '100%', fontSize: '0.85rem', fontWeight: 650, mb: 1.5 }}
          >
            How was your experience?
          </Typography>
          <Rating
            name="experience-rating"
            aria-labelledby="experience-rating-label"
            value={rating}
            onChange={(_event, next) => {
              setRating(next);
              setError('');
            }}
            onChangeActive={(_event, next) => setHoverRating(next)}
            getLabelText={(value) =>
              `${value} ${value === 1 ? 'star' : 'stars'} — ${ratingLabels[value]}`
            }
            sx={{
              fontSize: { xs: 36, sm: 40 },
              gap: 0.75,
              color: '#E9BA49',
              '& .MuiRating-iconEmpty': { color: 'text.disabled' },
              '& .MuiRating-label': { p: 0.25 },
            }}
          />
          <Typography
            aria-live="polite"
            sx={{ mt: 1, minHeight: 20, fontSize: '0.75rem', color: 'text.secondary' }}
          >
            {ratingLabels[hoverRating >= 0 ? hoverRating : (rating ?? 0)]}
          </Typography>
        </Box>

        <Stack spacing={2.5}>
          <TextField
            label="Your review (optional)"
            placeholder="What stood out? What could we improve?"
            value={form.comment}
            onChange={set('comment')}
            multiline
            minRows={3}
            fullWidth
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 2000 } }}
            helperText={`${form.comment.length.toLocaleString()} / 2,000 characters`}
            sx={{ '& .MuiFormHelperText-root': { textAlign: 'right', mr: 0, fontSize: '0.7rem' } }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pt: 0.5 }}>
            <Typography sx={{ whiteSpace: 'nowrap', fontWeight: 650, fontSize: '0.8rem' }}>
              A little about you
            </Typography>
            <Box sx={{ height: '1px', flex: 1, bgcolor: 'divider' }} />
          </Box>
          <TextField
            label="Public name"
            placeholder="How you’d like to appear"
            value={form.displayName}
            onChange={set('displayName')}
            required
            fullWidth
            size="small"
            autoComplete="name"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { minLength: 2, maxLength: 80 } }}
          />
          <TextField
            label="Email address"
            placeholder="you@example.com"
            type="email"
            value={form.email}
            onChange={set('email')}
            required
            fullWidth
            size="small"
            autoComplete="email"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 200 } }}
          />
          <TextField
            label="Your connection to IAA (optional)"
            placeholder="e.g. Programme participant, partner, volunteer"
            value={form.role}
            onChange={set('role')}
            fullWidth
            size="small"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 80 } }}
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2.5 }}>
            {error}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={state === 'busy'}
          fullWidth
          endIcon={state === 'busy' ? undefined : <ArrowForwardRoundedIcon />}
          sx={{ mt: 3, minHeight: 48, borderRadius: 2, fontWeight: 700 }}
        >
          {state === 'busy' ? 'Sending your review…' : 'Send my review'}
        </Button>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 2 }}>
          <LockOutlinedIcon sx={{ fontSize: 15, mt: 0.3, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: '0.72rem', lineHeight: 1.6, color: 'text.secondary' }}>
            Your email stays private. We’ll send a confirmation link, then read your review before
            publishing it as written.
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};
