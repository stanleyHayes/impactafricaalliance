import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

type Consent = 'accepted' | 'essential' | null;

const STORAGE_KEY = 'iaa-cookie-consent';

const initializeGa4 = (): void => {
  const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  if (!measurementId || measurementId === 'undefined' || measurementId === '') {
    return;
  }

  // Load the GA4 script dynamically only when consent is given and an ID is configured.
  if (!document.querySelector(`script[src*="gtag/js?id=${measurementId}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.dataLayer = w.dataLayer || [];

  w.gtag = function gtag(...args: unknown[]) {
    w.dataLayer.push(args);
  };
  w.gtag('js', new Date());
  w.gtag('config', measurementId, { anonymize_ip: true, send_page_view: true });
};

const getStoredConsent = (): Consent => {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Consent) ?? null;
  } catch {
    return null;
  }
};

const setStoredConsent = (value: Consent): void => {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, value);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // storage may be unavailable in private mode
  }
};

/** GDPR-style cookie consent banner with lazy GA4 initialisation. */
export const CookieBanner = (): JSX.Element | null => {
  const [consent, setConsent] = useState<Consent>(null);

  useEffect(() => {
    const stored = getStoredConsent();
    setConsent(stored);
    if (stored === 'accepted') {
      initializeGa4();
    }
    const handleOpen = (): void => setConsent(null);
    window.addEventListener('cookie-banner:open', handleOpen);
    return () => window.removeEventListener('cookie-banner:open', handleOpen);
  }, []);

  const handleAccept = useCallback((): void => {
    setStoredConsent('accepted');
    setConsent('accepted');
    initializeGa4();
  }, []);

  const handleEssentialOnly = useCallback((): void => {
    setStoredConsent('essential');
    setConsent('essential');
  }, []);

  if (consent !== null) {
    return null;
  }

  return (
    <Paper
      component="aside"
      role="dialog"
      aria-label="Cookie consent"
      elevation={0}
      sx={{
        position: 'fixed',
        right: { xs: 16, md: 24 },
        bottom: { xs: 16, md: 24 },
        left: { xs: 16, md: 'auto' },
        zIndex: (theme) => theme.zIndex.snackbar,
        maxWidth: 420,
        p: { xs: 2.5, md: 3 },
        border: '1px solid rgba(0,214,139,0.25)',
        borderRadius: 4,
        bgcolor: 'rgba(0,30,20,0.96)',
        color: 'common.white',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.75, color: 'primary.light', fontWeight: 700 }}>
        Your privacy matters
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6 }}>
        We use cookies to understand how visitors use our site and to improve the experience.
        Analytics cookies are only loaded if you accept. Read our{' '}
        <Link component={RouterLink} to="/privacy-policy" sx={{ color: 'primary.light' }}>
          Privacy Policy
        </Link>{' '}
        for more.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          fullWidth
          onClick={handleAccept}
          sx={{ minHeight: 38 }}
        >
          Accept all
        </Button>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          fullWidth
          onClick={handleEssentialOnly}
          sx={{ minHeight: 38, borderColor: 'rgba(0,214,139,0.5)', color: 'primary.light' }}
        >
          Essential only
        </Button>
      </Stack>
    </Paper>
  );
};
