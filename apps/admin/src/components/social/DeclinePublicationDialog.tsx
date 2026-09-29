import { DESTINATION_CAPABILITIES, type SocialPublication } from '@iaa/shared';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useRef, useState, type FormEvent } from 'react';

import { useRejectPublication } from '../../lib/social-publishing';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';

/**
 * Long enough to say what is wrong. The API accepts a single character, but
 * "no" tells the writer nothing, and the reason is all they have to go on.
 */
export const REASON_MIN = 10;
/** The API's own limit (`socialRejectionSchema`). */
export const REASON_MAX = 500;

/** What is wrong with the reason as typed, or null when it will do. */
export const reasonProblem = (reason: string): string | null => {
  const length = reason.trim().length;
  if (length === 0) return 'Say why this post is being declined.';
  if (length < REASON_MIN) {
    return `Give a little more detail: at least ${REASON_MIN} characters, so the writer knows what to change.`;
  }
  if (length > REASON_MAX) return `Keep the reason under ${REASON_MAX} characters.`;
  return null;
};

export interface DeclinePublicationDialogProps {
  /** The held post being declined. Null while the dialog is closed. */
  publication: SocialPublication | null;
  onClose: () => void;
}

/**
 * Declines a post that is waiting for approval, with a reason.
 *
 * This used the browser's `window.prompt`: a grey box with a one-line field,
 * no sign of which destination it was about, no limit shown, and nothing when
 * the request failed. The reason matters more than that. It is shown beside
 * the post to the writer as the only explanation they get, so it is asked for
 * in a proper field that says how much room there is, refuses an empty or
 * throwaway answer under the field itself, and keeps what was typed if the
 * request fails.
 */
export const DeclinePublicationDialog = ({
  publication,
  onClose,
}: DeclinePublicationDialogProps): JSX.Element => {
  const reject = useRejectPublication();
  const [reason, setReason] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  // The last post asked about, kept after `publication` clears so the
  // destination does not vanish from the header while the dialog fades out.
  const [shown, setShown] = useState<SocialPublication | null>(publication);
  if (publication !== null && publication !== shown) setShown(publication);

  const busy = reject.isPending;
  const problem = reasonProblem(reason);
  const destination = shown ? DESTINATION_CAPABILITIES[shown.destination].label : 'social';
  const invalid = showErrors && problem !== null;

  // Cleared once the dialog has gone, so the next post starts empty.
  const reset = (): void => {
    setReason('');
    setShowErrors(false);
    reject.reset();
  };

  // Not while the request runs: the answer would arrive with nowhere to show.
  const close = (): void => {
    if (!busy) onClose();
  };

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (busy || !publication) return;
    if (problem) {
      setShowErrors(true);
      // Back to the field, so the message under it is read out with it.
      fieldRef.current?.focus();
      return;
    }
    reject.mutate({ id: publication.id, reason: reason.trim() }, { onSuccess: onClose });
  };

  return (
    <Dialog
      open={publication !== null}
      onClose={close}
      maxWidth="sm"
      fullWidth
      slotProps={{
        // The shared header's title carries no id for aria-labelledby, so the
        // dialog is named on the paper, as the console's other dialogs are.
        paper: { sx: dialogPaperSx, 'aria-label': 'Decline this post' },
        transition: { onExited: reset },
      }}
    >
      <form noValidate onSubmit={submit}>
        <DialogHeader
          icon={<BlockRoundedIcon />}
          eyebrow="Social publishing"
          title="Decline this post"
          description={`The ${destination} post will not be published. The writer sees your reason beside it.`}
          tone="error"
          onClose={busy ? undefined : close}
        />
        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Reason for declining"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              multiline
              minRows={4}
              required
              autoFocus
              fullWidth
              disabled={busy}
              error={invalid}
              helperText={
                <Box
                  component="span"
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                >
                  <span>{invalid ? problem : 'What needs to change before this can go out.'}</span>
                  <Box component="span" sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {reason.length}/{REASON_MAX}
                  </Box>
                </Box>
              }
              inputRef={fieldRef}
              slotProps={{ htmlInput: { maxLength: REASON_MAX } }}
            />
            {reject.isError && (
              <Alert severity="error">
                {reject.error.message || 'The post could not be declined. Please try again.'}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogFooter>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="error" disabled={busy}>
            {busy ? 'Declining…' : 'Decline'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
