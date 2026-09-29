import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { useReducedMotion } from 'framer-motion';
import { useId, type ReactNode } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  /** The question, such as "Leave your application?". */
  title: string;
  /** What will happen if the person goes ahead, in a sentence or two. */
  description: ReactNode;
  /** The verb on the button that goes ahead, such as "Leave". */
  confirmLabel: string;
  /** The button that keeps things as they are. */
  cancelLabel?: string;
  /** `error` when going ahead loses something. */
  tone?: 'default' | 'error';
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Asks before doing something the person may regret, in the site's own
 * dialog rather than the browser's `confirm()` or "Leave site?" box, which
 * cannot be worded or styled and look like an error from somewhere else.
 *
 * Focus starts on the button that keeps things as they are, so a stray Enter
 * never goes ahead. It stays inside the dialog while it is open, Escape
 * closes it, and on closing it returns to whatever opened it.
 */
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onClose,
}: ConfirmDialogProps): JSX.Element => {
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      transitionDuration={reduceMotion ? 0 : undefined}
    >
      <DialogTitle id={titleId} sx={{ fontWeight: 700 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography id={descriptionId} component="div" sx={{ lineHeight: 1.7 }}>
          {description}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
        <Button autoFocus onClick={onClose} sx={{ color: 'text.primary', fontWeight: 700 }}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={tone === 'error' ? 'error' : 'primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
