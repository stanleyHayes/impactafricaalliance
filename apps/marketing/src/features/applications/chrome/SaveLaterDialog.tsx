import { DRAFT_RETENTION_DAYS, resumeLinkSchema } from '@iaa/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type SubmitEvent } from 'react';

import { failureKind, failureMessage } from '../errors';
import { QUIET_BUTTON_SX } from '../styles';

export interface SaveLaterDialogProps {
  open: boolean;
  /** The applicant's own email from their answers, to save typing it again. */
  suggestedEmail?: string;
  preview: boolean;
  onClose: () => void;
  onSend: (email: string) => Promise<void>;
}

const sendFailure = (error: unknown): string =>
  failureKind(error) === 'rate-limited'
    ? 'You have asked for a few links already. Wait a few minutes, then try again.'
    : failureMessage(error);

/**
 * "Save and finish later": asks for an address and has a link emailed there.
 * The confirmation never says whether a draft was found for that address,
 * because the API does not either (plan D8).
 */
export const SaveLaterDialog = ({
  open,
  suggestedEmail,
  preview,
  onClose,
  onSend,
}: SaveLaterDialogProps): JSX.Element => {
  const [email, setEmail] = useState(suggestedEmail ?? '');
  const [problem, setProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Each opening starts fresh, with the latest address from the answers.
  useEffect(() => {
    if (open) {
      setEmail(suggestedEmail ?? '');
      setProblem(null);
      setFailure(null);
      setSent(false);
    }
  }, [open, suggestedEmail]);

  const onSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsed = resumeLinkSchema.safeParse({ email });
    if (!parsed.success) {
      setProblem('Enter an email address, like name@example.com.');
      return;
    }
    setProblem(null);
    setFailure(null);
    setSending(true);
    onSend(parsed.data.email).then(
      () => {
        setSending(false);
        setSent(true);
      },
      (error: unknown) => {
        setSending(false);
        setFailure(sendFailure(error));
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={sending ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="save-later-title"
    >
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle id="save-later-title" sx={{ fontWeight: 700 }}>
          Save and finish later
        </DialogTitle>
        <DialogContent>
          {sent ? (
            <Typography role="status" sx={{ lineHeight: 1.7 }}>
              {preview
                ? 'In a preview no email is sent. Applicants are told: if that address can receive email, a link is on its way.'
                : `If that address can receive email, a link is on its way. It opens your application where you left it, for the next ${DRAFT_RETENTION_DAYS} days.`}
            </Typography>
          ) : (
            <>
              <Typography sx={{ lineHeight: 1.7 }}>
                {preview && 'This is a preview, so nothing is saved or emailed. Applicants read: '}
                Your answers are saved. We will email you a link that opens your application where
                you left it, on any device. Answers are kept for {DRAFT_RETENTION_DAYS} days after
                your last change.
              </Typography>
              <TextField
                autoFocus
                fullWidth
                type="email"
                label="Email address"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={Boolean(problem)}
                helperText={problem ?? ' '}
                sx={{ mt: 2.5 }}
                slotProps={{ htmlInput: { inputMode: 'email' } }}
              />
              {failure && (
                <Alert severity="error" sx={{ mt: 1, borderRadius: 3 }}>
                  {failure}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {sent ? (
            <Button variant="contained" onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={onClose} disabled={sending} sx={QUIET_BUTTON_SX}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={sending}>
                {sending ? 'Sending…' : 'Email me a link'}
              </Button>
            </>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
};
