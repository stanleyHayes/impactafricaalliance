import type { SiteSettingPopup } from '@iaa/shared';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';

import { useSiteSettings } from '../../lib/content-hooks';

const SESSION_KEY = 'iaa:welcome-seen';
const FOREVER_KEY = 'iaa:welcome-suppressed';

/** Storage access throws outright in some privacy modes, so every call is guarded. */
const readFlag = (storage: 'local' | 'session', key: string): boolean => {
  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    return store.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (storage: 'local' | 'session', key: string): void => {
  try {
    const store = storage === 'local' ? window.localStorage : window.sessionStorage;
    store.setItem(key, '1');
  } catch {
    // Non-fatal: the dialog still closes for this page view.
  }
};


interface PopupBodyProps {
  popup: SiteSettingPopup;
  suppress: boolean;
  onSuppressChange: (value: boolean) => void;
  onClose: () => void;
}

const PopupBody = ({ popup, suppress, onSuppressChange, onClose }: PopupBodyProps): JSX.Element => (
  <>
    {popup.imageUrl && (
      <Box
        component="img"
        src={popup.imageUrl}
        alt=""
        sx={{ width: '100%', height: 170, objectFit: 'cover' }}
      />
    )}

    <Box sx={{ position: 'relative', p: { xs: 3, sm: 3.5 } }}>
      <IconButton
        aria-label="Close"
        onClick={onClose}
        size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary' }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>

      {popup.title && (
        <Typography id="welcome-popup-title" variant="h5" sx={{ pr: 4, mb: 1.25, lineHeight: 1.25 }}>
          {popup.title}
        </Typography>
      )}

      {popup.message && (
        <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {popup.message}
        </Typography>
      )}

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {popup.ctaUrl && (
          <Button
            href={popup.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            endIcon={<EastRoundedIcon />}
            onClick={onClose}
            sx={{ fontWeight: 750 }}
          >
            {popup.ctaLabel || 'Learn more'}
          </Button>
        )}
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Not now
        </Button>
      </Stack>

      <FormControlLabel
        sx={{ mt: 1 }}
        control={
          <Checkbox
            size="small"
            checked={suppress}
            onChange={(_event, checked) => onSuppressChange(checked)}
          />
        }
        label={
          <Typography variant="caption" color="text.secondary">
            Don&apos;t show this again
          </Typography>
        }
      />
    </Box>
  </>
);

/**
 * First-visit welcome dialog. It shows once per browsing session by default —
 * not on every page change — and the checkbox lets a visitor turn it off for
 * good. Content comes from site settings so it can be edited or switched off
 * from the dashboard.
 */
export const WelcomePopup = (): JSX.Element | null => {
  const { data } = useSiteSettings();
  const popup = data?.popup;
  const active = Boolean(popup?.enabled && (popup.title || popup.message));

  const [open, setOpen] = useState(false);
  const [suppress, setSuppress] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    // Only ever schedule once per mount, so navigating does not re-arm it.
    if (!active || shownRef.current) {
      return undefined;
    }
    if (readFlag('local', FOREVER_KEY) || readFlag('session', SESSION_KEY)) {
      return undefined;
    }
    shownRef.current = true;
    const timer = window.setTimeout(
      () => setOpen(true),
      Math.max(0, popup?.delaySeconds ?? 2) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [active, popup?.delaySeconds]);

  if (!active || !popup) {
    return null;
  }

  const close = (): void => {
    setOpen(false);
    writeFlag('session', SESSION_KEY);
    if (suppress) {
      writeFlag('local', FOREVER_KEY);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="xs"
      fullWidth
      aria-labelledby="welcome-popup-title"
      slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
    >
      <PopupBody
        popup={popup}
        suppress={suppress}
        onSuppressChange={setSuppress}
        onClose={close}
      />
    </Dialog>
  );
};
