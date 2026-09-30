import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent } from 'react';

import { thumbnailUrl, type SlotView } from '../../lib/site-images';
import { useSaveResource } from '../../resources/hooks';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';

interface SiteImageAltDialogProps {
  /** A slot showing its own upload; only those have a description to edit. */
  view: SlotView & { record: NonNullable<SlotView['record']> };
  pageLabel: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/**
 * Change what a screen reader hears for a replaced picture, without choosing
 * the picture again. Emptying the field clears the description, and the
 * site falls back to the one saved with the picture in the media library.
 */
export const SiteImageAltDialog = ({
  view,
  pageLabel,
  onClose,
  onSaved,
}: SiteImageAltDialogProps): JSX.Element => {
  const { slot, record } = view;
  const save = useSaveResource('site-images');
  const [alt, setAlt] = useState(record.alt ?? '');

  const submit = (event?: FormEvent): void => {
    event?.preventDefault();
    if (save.isPending) return;
    save.mutate(
      { id: record.id, body: { alt: alt.trim() } },
      { onSuccess: () => onSaved(`Alt text saved for ${slot.label}.`) },
    );
  };

  return (
    <Dialog
      open
      onClose={save.isPending ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      // The branded header is not a DialogTitle, so the dialog is named here.
      slotProps={{ paper: { sx: dialogPaperSx, 'aria-label': `Alt text for ${slot.label}` } }}
    >
      <DialogHeader
        icon={<EditNoteRoundedIcon />}
        eyebrow={pageLabel}
        title={`Alt text for ${slot.label}`}
        description="Read aloud to people using a screen reader, in place of the picture."
        onClose={save.isPending ? undefined : onClose}
      />
      <DialogContent dividers>
        <Stack component="form" id="site-image-alt" spacing={2} onSubmit={submit}>
          <Box
            component="img"
            src={thumbnailUrl(record.image.url)}
            alt=""
            sx={{
              width: '100%',
              aspectRatio: slot.aspect,
              objectFit: 'cover',
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          />
          <TextField
            label="Alt text"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            disabled={save.isPending}
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { maxLength: 300 } }}
            helperText={
              record.image.alt
                ? `Leave it blank to use the media library's description: “${record.image.alt}”.`
                : 'Say what is in the picture, as you would to someone who cannot see it.'
            }
          />
          {save.isError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {save.error.message || 'The alt text could not be saved. Please try again.'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" form="site-image-alt" variant="contained" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
