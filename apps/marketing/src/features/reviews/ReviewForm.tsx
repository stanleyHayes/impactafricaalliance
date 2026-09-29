import { organisationReviewInputSchema } from '@iaa/shared';
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

type ReviewField = 'displayName' | 'email' | 'role' | 'comment';

// Each answer's input id, so a problem can be shown on it and focus sent there.
const FIELD_IDS: Record<ReviewField, string> = {
  displayName: 'review-display-name',
  email: 'review-email',
  role: 'review-role',
  comment: 'review-comment',
};

const isReviewField = (key: unknown): key is ReviewField =>
  typeof key === 'string' && key in FIELD_IDS;

/** The first problem with each answer, from the schema's own messages. */
const fieldProblems = (
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Partial<Record<ReviewField, string>> => {
  const problems: Partial<Record<ReviewField, string>> = {};
  for (const issue of issues) {
    const [key] = issue.path;
    if (isReviewField(key) && !problems[key]) {
      problems[key] = issue.message;
    }
  }
  return problems;
};

/**
 * The organisation review, in two steps.
 *
 * The form turns off the browser's own checks (`noValidate`): their bubbles
 * cannot be styled, vanish after a moment and are not read out reliably. The
 * schema's messages are shown under each answer instead, and focus goes to
 * the first one that needs attention.
 */
export const ReviewForm = ({ preview = false }: { preview?: boolean }): JSX.Element => {
  const [step, setStep] = useState(0);
  const [hoverRating, setHoverRating] = useState(-1);
  const [rating, setRating] = useState<number | null>(null);
  const [form, setForm] = useState({ displayName: '', email: '', role: '', comment: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<Partial<Record<ReviewField, string>>>({});

  const set = (field: ReviewField) => (event: { target: { value: string } }) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    setProblems((previous) => ({ ...previous, [field]: undefined }));
  };

  /** Error state and message for one answer, falling back to its usual help. */
  const problemProps = (field: ReviewField, help?: string) => ({
    id: FIELD_IDS[field],
    error: Boolean(problems[field]),
    helperText: problems[field] ?? help,
  });

  /**
   * Each problem under its own answer, with focus on the first. Anything not
   * tied to an answer goes in the alert above the buttons.
   */
  const showProblems = (issues: readonly { path: PropertyKey[]; message: string }[]): void => {
    const found = fieldProblems(issues);
    const first = (Object.keys(FIELD_IDS) as ReviewField[]).find((field) => found[field]);
    setProblems(found);
    setError(first ? '' : issues[0]?.message || 'Please check your details.');
    if (first) {
      document.getElementById(FIELD_IDS[first])?.focus();
    }
  };

  const submit = async (): Promise<void> => {
    if (state === 'busy') return;
    if (rating === null) {
      setError('Choose a rating first.');
      return;
    }
    if (step === 0) {
      setStep(1);
      setError('');
      return;
    }
    const validation = organisationReviewInputSchema.safeParse({
      ...form,
      displayName: form.displayName.trim(),
      rating,
      consent: true,
    });
    if (!validation.success) {
      showProblems(validation.error.issues);
      return;
    }
    if (preview) {
      setState('sent');
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
      <Alert severity="success" sx={{ boxSizing: 'border-box' }}>
        {preview && <strong>Demo only — nothing was sent. </strong>}
        Check your email — we have sent a link to confirm it is you. Nothing is published until you
        click it, and until someone here has read it.
      </Alert>
    );
  }

  let submitLabel = preview ? 'Preview submission' : 'Send my review';
  if (step === 0) submitLabel = 'Continue';
  if (state === 'busy') submitLabel = 'Sending your review…';

  return (
    <Box
      component="form"
      id="review-form"
      noValidate
      tabIndex={-1}
      aria-labelledby="review-form-title"
      aria-busy={state === 'busy'}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
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
          pt: 2.5,
          pb: 2,
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
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} aria-label="Review progress">
          {['Your experience', 'About you'].map((label, index) => (
            <Box
              key={label}
              aria-current={step === index ? 'step' : undefined}
              sx={{
                flex: 1,
                borderTop: 2,
                borderColor: step >= index ? 'primary.main' : 'divider',
                pt: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: step === index ? 700 : 400,
                  color: step === index ? 'text.primary' : 'text.secondary',
                }}
              >
                {index + 1}. {label}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box
        component="fieldset"
        disabled={state === 'busy'}
        sx={{
          m: 0,
          border: 0,
          minWidth: 0,
          p: { xs: 2.5, sm: 3 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.9rem' },
          '& .MuiInputLabel-root': { fontSize: '0.9rem' },
        }}
      >
        {step === 0 && (
          <>
            <Box sx={{ textAlign: 'center', pb: 2 }}>
              <Typography
                component="p"
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

            <TextField
              label="Your review (optional)"
              placeholder="What stood out? What could we improve?"
              value={form.comment}
              onChange={set('comment')}
              multiline
              minRows={2}
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 2000 } }}
              {...problemProps(
                'comment',
                `${form.comment.length.toLocaleString()} / 2,000 characters`,
              )}
              sx={{
                '& .MuiFormHelperText-root': { textAlign: 'right', mr: 0, fontSize: '0.7rem' },
              }}
            />
          </>
        )}
        {step === 1 && (
          <Stack spacing={2.5}>
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
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 80 } }}
              {...problemProps('displayName')}
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
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { maxLength: 200, inputMode: 'email' },
              }}
              {...problemProps('email')}
            />
            <TextField
              label="Your connection to IAA (optional)"
              placeholder="e.g. Programme participant, partner, volunteer"
              value={form.role}
              onChange={set('role')}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 80 } }}
              {...problemProps('role')}
            />
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2.5 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" spacing={1.5} sx={{ pt: 2 }}>
          {step === 1 && (
            <Button
              type="button"
              disabled={state === 'busy'}
              onClick={() => {
                setStep(0);
                setError('');
              }}
              sx={{ color: 'text.primary' }}
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={state === 'busy'}
            fullWidth
            endIcon={state === 'busy' ? undefined : <ArrowForwardRoundedIcon />}
            sx={{ minHeight: 48, borderRadius: 2, fontWeight: 700 }}
          >
            {submitLabel}
          </Button>
        </Stack>
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
