import type { ApplicationRecommendation } from '@iaa/shared';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent } from 'react';

import type { ReviewBody } from '../../lib/applications';
import { APPLICATION_RECOMMENDATION_OPTIONS, withAnyOption } from '../../lib/select-options';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';
import { OptionSelect, type SelectChoice } from '../fields/OptionSelect';

const SCORE_OPTIONS: SelectChoice[] = withAnyOption(
  [
    { value: '5', label: '5 · Outstanding' },
    { value: '4', label: '4 · Strong' },
    { value: '3', label: '3 · Sound' },
    { value: '2', label: '2 · Weak' },
    { value: '1', label: '1 · Poor' },
  ],
  'No score',
  'Leave the score out; the notes and recommendation carry the view.',
);

const RECOMMENDATIONS = withAnyOption(
  APPLICATION_RECOMMENDATION_OPTIONS,
  'No recommendation',
  'Notes only, without a view either way.',
);

/**
 * "Add review": notes, a recommendation and a score, three fields in a small
 * dialog. Reviews are internal; the dialog says so, because the notes are
 * often frank.
 */
export const ReviewDialog = ({
  open,
  applicantName,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  applicantName: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (review: ReviewBody) => void;
  onClose: () => void;
}): JSX.Element => {
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [score, setScore] = useState('');
  const [missing, setMissing] = useState(false);

  const reset = (): void => {
    setNotes('');
    setRecommendation('');
    setScore('');
    setMissing(false);
  };
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (pending) return;
    if (!notes.trim()) {
      setMissing(true);
      return;
    }
    onSubmit({
      notes: notes.trim(),
      ...(recommendation ? { recommendation: recommendation as ApplicationRecommendation } : {}),
      ...(score ? { score: Number(score) } : {}),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: dialogPaperSx }, transition: { onExited: reset } }}
    >
      <form onSubmit={submit} noValidate>
        <DialogHeader
          icon={<RateReviewOutlinedIcon />}
          eyebrow="Internal review"
          title="Add a review"
          description={`Your view of ${applicantName}'s application. Colleagues who can read applications see it; the applicant never does.`}
          onClose={pending ? undefined : onClose}
        />
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Notes"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setMissing(false);
              }}
              multiline
              minRows={4}
              required
              autoFocus
              error={missing}
              helperText={
                missing ? 'Write a few words on why.' : 'What stood out, and what would decide it.'
              }
              slotProps={{ htmlInput: { maxLength: 5000 } }}
              fullWidth
            />
            <OptionSelect
              label="Recommendation"
              options={RECOMMENDATIONS}
              value={recommendation}
              onChange={setRecommendation}
              placeholder="No recommendation"
            />
            <OptionSelect
              label="Score"
              options={SCORE_OPTIONS}
              value={score}
              onChange={setScore}
              placeholder="No score"
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogFooter>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Saving…' : 'Add review'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
