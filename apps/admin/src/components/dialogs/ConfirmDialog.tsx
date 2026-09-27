import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import { useId, type ReactNode } from 'react';

import { DialogFooter, DialogHeader, dialogPaperSx } from './DialogShell';

export interface ConfirmDialogProps {
  open: boolean;
  /** A question naming the action, such as "Delete this document?". */
  title: string;
  /**
   * What will happen, naming the record: "Budget 2026.xlsx will be removed
   * from this project. This cannot be undone." A node, so the name can be
   * bold.
   */
  description: ReactNode;
  /** The verb on the button, such as "Delete". */
  confirmLabel: string;
  /** Shown on the button while the action runs. Defaults to the label with an ellipsis. */
  pendingLabel?: string;
  /** `error` for anything that removes or cannot be undone. */
  tone?: 'error' | 'default';
  /** Small heading above the title, usually the area of the console. */
  eyebrow?: string;
  /** Replaces the default icon (a bin for `error`, a question mark otherwise). */
  icon?: ReactNode;
  /** True while the action runs; the confirm button is disabled so it cannot be sent twice. */
  pending?: boolean;
  /** Why the last attempt failed, shown above the buttons so the reader can try again. */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Asks before doing something that cannot be taken back.
 *
 * The console confirmed in three ways: the browser's own `window.confirm`,
 * a bespoke dialog on the Events page, and a mode of `RecordActions`. This is
 * the Events version made general, so every confirmation names the record it
 * is about, uses the branded header, and shows that it is working rather than
 * letting a second click send the request again.
 */
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  tone = 'default',
  eyebrow,
  icon,
  pending = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps): JSX.Element => {
  const descriptionId = useId();
  const defaultIcon = tone === 'error' ? <DeleteOutlinedIcon /> : <HelpOutlineRoundedIcon />;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-describedby={descriptionId}
      // The branded header is not a DialogTitle, so the dialog is named here.
      slotProps={{ paper: { sx: dialogPaperSx, 'aria-label': title } }}
    >
      <DialogHeader
        icon={icon ?? defaultIcon}
        eyebrow={eyebrow}
        title={title}
        tone={tone}
        onClose={onClose}
      />
      <DialogContent sx={{ py: 3 }}>
        <Typography id={descriptionId} variant="body2" color="text.secondary" component="div">
          {description}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={tone === 'error' ? 'error' : 'primary'}
          disabled={pending}
        >
          {pending ? (pendingLabel ?? `${confirmLabel}…`) : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
