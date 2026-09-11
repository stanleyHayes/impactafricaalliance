import { reviewLinkRequestSchema } from '@iaa/shared';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { apiPost } from '../../lib/api-client';

/**
 * The way back in for someone who no longer has the invitation.
 *
 * Reviewing is tied to a registration, and the proof of that registration is
 * the signed link in the follow-up email. Anyone who deleted it — or never got
 * it — had nowhere to go, which is how a finished event ends up with a review
 * section and no way to review it.
 */
export const ReviewLinkRequest = ({ eventId }: { eventId: string }): JSX.Element => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (): Promise<void> => {
    if (busy) return;
    const parsed = reviewLinkRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter the email you registered with.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiPost(`/reviews/events/${eventId}/link`, { email: parsed.data.email });
      setSent(true);
    } catch (cause) {
      setError((cause as Error).message || 'That could not be sent. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <Alert severity="success" sx={{ maxWidth: 600 }}>
        If that address was registered for this event, your review link is on its way. Check your
        inbox — and your spam folder, just in case.
      </Alert>
    );

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', px: { xs: 0.5, md: 1 } }}>
      <MailOutlineRoundedIcon sx={{ color: 'text.secondary', fontSize: 21, mt: 0.25 }} />
      <Box sx={{ maxWidth: 600, width: '100%' }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
          Attended this event? Your voice belongs here.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: '0.825rem' }}>
          Your review link was emailed to you after the event. Lost it? Enter the address you
          registered with and we will send it again.
        </Typography>
        <Stack
          component="form"
          aria-label="Send me my review link"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ mt: 2, alignItems: { sm: 'flex-start' } }}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <TextField
            label="Email you registered with"
            type="email"
            size="small"
            fullWidth
            required
            disabled={busy}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError('');
            }}
            error={error !== ''}
            helperText={error || ' '}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 200 } }}
          />
          <Button
            type="submit"
            variant="outlined"
            disabled={busy}
            sx={{ fontWeight: 700, flexShrink: 0, height: 40 }}
          >
            {busy ? 'Sending…' : 'Send my link'}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};
