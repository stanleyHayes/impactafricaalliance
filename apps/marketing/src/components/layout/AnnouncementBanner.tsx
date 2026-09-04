import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { useSiteSettings } from '../../lib/content-hooks';

const STORAGE_PREFIX = 'iaa:announcement-dismissed:';

/**
 * Key the dismissal on the message itself, so publishing a new announcement
 * shows again to someone who dismissed the previous one.
 */
const storageKey = (message: string): string => {
  let hash = 0;
  for (let index = 0; index < message.length; index += 1) {
    hash = (hash << 5) - hash + message.charCodeAt(index);
    hash |= 0;
  }
  return `${STORAGE_PREFIX}${hash}`;
};

const readDismissed = (key: string): boolean => {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    // Private mode or blocked storage — treat as not dismissed.
    return false;
  }
};

/**
 * Site-wide notice above the header. Content comes from site settings so it can
 * be edited or switched off from the dashboard; dismissal is per-visitor and
 * never leaves their browser.
 */
export const AnnouncementBanner = (): JSX.Element | null => {
  const { data } = useSiteSettings();
  const announcement = data?.announcement;
  const message = announcement?.enabled ? announcement.message?.trim() : undefined;

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(message ? readDismissed(storageKey(message)) : false);
  }, [message]);

  if (!message || dismissed) {
    return null;
  }

  const handleDismiss = (): void => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey(message), '1');
    } catch {
      // Non-fatal: the banner still closes for this page view.
    }
  };

  return (
    <Box
      role="region"
      aria-label="Site announcement"
      sx={{
        position: 'relative',
        bgcolor: 'secondary.main',
        color: 'common.black',
        // Sits above the sticky header so the header's blur never bleeds over it.
        zIndex: (theme) => theme.zIndex.appBar + 1,
      }}
    >
      <Container maxWidth="xl">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={{ xs: 1, sm: 1.5 }}
          sx={{ minHeight: 44, py: 0.75, pr: 4.5, textAlign: 'center' }}
        >
          <Typography
            sx={{
              fontSize: { xs: '0.78rem', sm: '0.85rem' },
              fontWeight: 700,
              letterSpacing: 0.2,
              lineHeight: 1.45,
            }}
          >
            {message}
          </Typography>

          {announcement?.linkUrl && (
            <Link
              href={announcement.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                alignItems: 'center',
                flexShrink: 0,
                gap: 0.5,
                color: 'common.black',
                fontSize: '0.82rem',
                fontWeight: 800,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                '&:hover': { opacity: 0.75 },
              }}
            >
              {announcement.linkLabel || 'Learn more'}
              <EastRoundedIcon sx={{ fontSize: 15 }} />
            </Link>
          )}
        </Stack>
      </Container>

      <IconButton
        aria-label="Dismiss announcement"
        onClick={handleDismiss}
        size="small"
        sx={{
          position: 'absolute',
          top: '50%',
          right: { xs: 4, sm: 10 },
          color: 'common.black',
          transform: 'translateY(-50%)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
        }}
      >
        <CloseRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
};
