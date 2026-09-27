import type { AdminApplication, ReviewableApplicationStatus } from '@iaa/shared';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

import { useChangeApplicationStatus } from '../../lib/applications';
import { APPLICATION_STATUS_OPTIONS } from '../../lib/select-options';
import { DetailSection } from '../detail/DetailSection';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';
import { OptionSelect } from '../fields/OptionSelect';

import { applicationStatusLabel } from './ApplicationChips';

/** Decisions are asked about first: the applicant is not told, so a slip would go unnoticed. */
const DECISIONS: readonly ReviewableApplicationStatus[] = ['accepted', 'rejected'];

/**
 * Move an application on, with a note for the history saying why. Accepting
 * or declining asks first. Nothing here emails the applicant.
 */
export const StatusChangePanel = ({
  application,
  canUpdate,
}: {
  application: AdminApplication;
  canUpdate: boolean;
}): JSX.Element => {
  const change = useChangeApplicationStatus();
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const name = application.applicant.name ?? application.reference;
  const target = status as ReviewableApplicationStatus;

  const apply = (): void =>
    change.mutate(
      { id: application.id, status: target, ...(note.trim() ? { note: note.trim() } : {}) },
      {
        onSuccess: () => {
          setStatus('');
          setNote('');
          setConfirming(false);
        },
      },
    );

  if (!canUpdate) {
    return (
      <DetailSection title="Status" icon={<SwapHorizRoundedIcon />}>
        <Alert severity="info">
          You can read applications but not change them. An administrator can give you access under
          Users.
        </Alert>
      </DetailSection>
    );
  }

  return (
    <DetailSection
      title="Change status"
      icon={<SwapHorizRoundedIcon />}
      description="The history keeps every change, who made it and the note."
    >
      <Stack spacing={2}>
        <OptionSelect
          label="New status"
          options={APPLICATION_STATUS_OPTIONS.filter(
            (option) => option.value !== application.status,
          )}
          value={status}
          onChange={setStatus}
          placeholder="Choose a status"
          disabled={change.isPending}
        />
        <TextField
          label="Note for the history"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={2}
          disabled={change.isPending}
          helperText="Optional. Why it moved, for whoever reads this next."
          slotProps={{ htmlInput: { maxLength: 1000 } }}
          fullWidth
        />
        {change.isError && !confirming && (
          <Alert severity="error">
            {change.error.message || 'The status could not be changed.'}
          </Alert>
        )}
        <Button
          variant="contained"
          onClick={() => (DECISIONS.includes(target) ? setConfirming(true) : apply())}
          disabled={!status || change.isPending}
        >
          {change.isPending ? 'Saving…' : 'Change status'}
        </Button>
      </Stack>
      <ConfirmDialog
        open={confirming}
        eyebrow="Applications"
        title={target === 'accepted' ? 'Accept this application?' : 'Decline this application?'}
        description={
          <>
            <strong>{name}</strong> ({application.reference}) will be marked{' '}
            {status ? applicationStatusLabel(target).toLowerCase() : ''}. They are not emailed: let
            them know yourself. You can change it again later.
          </>
        }
        confirmLabel={target === 'accepted' ? 'Accept' : 'Decline'}
        tone={target === 'rejected' ? 'error' : 'default'}
        pending={change.isPending}
        error={change.isError ? change.error.message : null}
        onConfirm={apply}
        onClose={() => setConfirming(false)}
      />
    </DetailSection>
  );
};
