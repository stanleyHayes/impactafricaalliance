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
import { alpha } from '@mui/material/styles';
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

const PopupArtwork = ({ src }: { src?: string }): JSX.Element => {
  const [failed, setFailed] = useState<string>();
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#163E32',
        minHeight: { xs: 150, sm: 390 },
        height: '100%',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 320 440"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <path fill="#F6CA4B" d="M0 0h320v440H0z" />
        <circle cx="274" cy="78" r="112" fill="#EF896B" />
        <path d="M-38 260C-38 134 164 108 164 240v200H-38Z" fill="#173F33" />
        <path d="M60 440V247a72 72 0 0 1 144 0v193" fill="none" stroke="#72D9AB" strokeWidth="32" />
        <path d="M211 440V301a70 70 0 0 1 140-1" fill="none" stroke="#B9AAE5" strokeWidth="42" />
        <circle cx="124" cy="119" r="38" fill="#F8F1D8" />
        <path
          d="M124 58V42m0 154v-16m-61-61H47m154 0h-16M81 76 69 64m110 110-12-12M81 162l-12 12M179 64l-12 12"
          stroke="#F8F1D8"
          strokeWidth="2"
        />
        <g fill="none" stroke="#173F33" strokeOpacity=".18">
          <circle cx="303" cy="44" r="142" />
          <circle cx="303" cy="44" r="165" />
          <circle cx="303" cy="44" r="188" />
          <path d="m225 0 39 80 56-23M264 80l-46 78 102 26" />
        </g>
        <g fill="#F8F1D8">
          <circle cx="41" cy="364" r="4" />
          <circle cx="254" cy="219" r="5" />
          <circle cx="278" cy="254" r="3" />
        </g>
      </Box>
      {src && failed !== src && (
        <Box
          component="img"
          src={src}
          alt=""
          onError={() => setFailed(src)}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: { xs: 2, sm: 3 },
          background: 'linear-gradient(transparent, rgba(14,42,34,.85))',
        }}
      >
        <Typography
          sx={{
            color: '#FFF4D6 !important',
            fontSize: '.7rem',
            fontWeight: 750,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Impact Africa Alliance
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            color: '#FFF4D6 !important',
            fontSize: { xs: '1.1rem', sm: '1.4rem' },
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          People. Ideas. Possibility.
        </Typography>
      </Box>
    </Box>
  );
};

const PopupBody = ({ popup, suppress, onSuppressChange, onClose }: PopupBodyProps): JSX.Element => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '0.85fr 1.15fr' } }}>
    <PopupArtwork src={popup.imageUrl} />

    <Box
      sx={{
        position: 'relative',
        p: { xs: 3, sm: 4 },
        pt: { xs: 3, sm: 5.5 },
        bgcolor: (t) => (t.palette.mode === 'dark' ? '#183A30' : '#FFFAED'),
      }}
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        size="small"
        sx={{
          position: 'absolute',
          top: { xs: -138, sm: 12 },
          right: 12,
          width: 34,
          height: 34,
          color: '#173F33',
          bgcolor: '#FFF4D6',
          '&:hover': { bgcolor: '#F6CA4B' },
        }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>

      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 2,
          px: 1.25,
          py: 0.5,
          borderRadius: 99,
          bgcolor: (t) => alpha('#F6CA4B', t.palette.mode === 'dark' ? 0.16 : 0.25),
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: (t) => (t.palette.mode === 'dark' ? '#F6CA4B' : '#806016'),
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 650 }}>
          From the Alliance
        </Typography>
      </Box>

      {popup.title && (
        <Typography
          id="welcome-popup-title"
          variant="h4"
          component="h2"
          sx={{
            mb: 1.5,
            fontSize: { xs: '1.7rem', sm: '2rem' },
            lineHeight: 1.15,
            overflowWrap: 'anywhere',
          }}
        >
          {popup.title}
        </Typography>
      )}

      {popup.message && (
        <Typography
          id="welcome-popup-description"
          color="text.secondary"
          sx={{ lineHeight: 1.7, fontSize: '.95rem', overflowWrap: 'anywhere' }}
        >
          {popup.message}
        </Typography>
      )}

      <Stack spacing={0.5} sx={{ mt: 2.5 }}>
        {popup.ctaUrl && (
          <Button
            href={popup.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            endIcon={<EastRoundedIcon />}
            onClick={onClose}
            sx={{
              fontWeight: 750,
              bgcolor: '#F6CA4B',
              color: '#173F33',
              '&:hover': { bgcolor: '#FFDA70' },
            }}
          >
            {popup.ctaLabel || 'Learn more'}
          </Button>
        )}
        <Button onClick={onClose} sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Not now
        </Button>
      </Stack>

      <FormControlLabel
        sx={{ mt: 1.5, mx: 0, alignItems: 'center', borderTop: 1, borderColor: 'divider', pt: 1 }}
        control={
          <Checkbox
            size="small"
            sx={{
              color: 'text.secondary',
              '&.Mui-checked': {
                color: (t) => (t.palette.mode === 'dark' ? '#F6CA4B' : '#173F33'),
              },
            }}
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
  </Box>
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
      maxWidth="sm"
      fullWidth
      aria-labelledby={popup.title ? 'welcome-popup-title' : undefined}
      aria-label={popup.title ? undefined : 'From the Alliance'}
      aria-describedby={popup.message ? 'welcome-popup-description' : undefined}
      slotProps={{
        paper: {
          sx: {
            width: 'calc(100% - 32px)',
            maxWidth: 720,
            m: 2,
            maxHeight: 'calc(100% - 32px)',
            borderRadius: 5,
            overflowX: 'hidden',
            overflowY: 'auto',
            boxShadow: '0 24px 90px rgba(0,0,0,.32)',
          },
        },
        backdrop: { sx: { bgcolor: 'rgba(7,23,17,.65)', backdropFilter: 'blur(5px)' } },
      }}
    >
      <PopupBody popup={popup} suppress={suppress} onSuppressChange={setSuppress} onClose={close} />
    </Dialog>
  );
};
