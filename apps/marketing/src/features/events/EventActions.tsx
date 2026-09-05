import { ORG, type Event } from '@iaa/shared';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import FacebookIcon from '@mui/icons-material/Facebook';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import XIcon from '@mui/icons-material/X';
import Button from '@mui/material/Button';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { useState } from 'react';

import { calendarUrlFor } from '../../lib/event-links';

/** Where each network wants the text and the link. */
const SHARE_TARGETS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    Icon: WhatsAppIcon,
    href: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    Icon: LinkedInIcon,
    href: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    key: 'x',
    label: 'X',
    Icon: XIcon,
    href: (url: string, text: string) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    Icon: FacebookIcon,
    href: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'email',
    label: 'Email',
    Icon: EmailRoundedIcon,
    href: (url: string, text: string) =>
      `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
] as const;

const ghostButton = {
  color: 'rgba(255,255,255,0.92)',
  borderColor: 'rgba(255,255,255,0.28)',
  fontWeight: 700,
  '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.08)' },
} as const;

/**
 * Save, share and copy for a single event.
 *
 * "Save" is a calendar file rather than an account-bound bookmark: there are no
 * visitor accounts, and a calendar entry is what someone actually wants — it
 * reminds them without needing to come back to the site.
 */
export const EventActions = ({ event }: { event: Event }): JSX.Element => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [notice, setNotice] = useState('');

  const pageUrl = `${ORG.website}/events/${event.id}`;
  const shareText = `${event.title} — ${ORG.name}`;

  const copyLink = async (): Promise<void> => {
    setMenuAnchor(null);
    try {
      await navigator.clipboard.writeText(pageUrl);
      setNotice('Link copied.');
    } catch {
      // Clipboard access is refused in some browsers and on insecure origins.
      setNotice('Press ⌘/Ctrl + C to copy the link from the address bar.');
    }
  };

  const share = async (target: HTMLElement): Promise<void> => {
    // The native sheet is the better experience where it exists, and is the
    // only route to a phone's installed apps.
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: shareText, url: pageUrl });
        return;
      } catch {
        // Cancelled, or refused; fall through to the menu.
      }
    }
    setMenuAnchor(target);
  };

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          component="a"
          href={calendarUrlFor(event.id)}
          startIcon={<CalendarMonthRoundedIcon />}
          sx={ghostButton}
        >
          Add to calendar
        </Button>
        <Button
          variant="outlined"
          startIcon={<IosShareRoundedIcon />}
          onClick={(clickEvent) => void share(clickEvent.currentTarget)}
          sx={ghostButton}
        >
          Share
        </Button>
        <Button
          variant="outlined"
          startIcon={notice === 'Link copied.' ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          onClick={() => void copyLink()}
          sx={ghostButton}
        >
          Copy link
        </Button>
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {SHARE_TARGETS.map(({ key, label, Icon, href }) => (
          <MenuItem
            key={key}
            component="a"
            href={href(pageUrl, shareText)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuAnchor(null)}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
          </MenuItem>
        ))}
        <MenuItem onClick={() => void copyLink()}>
          <ListItemIcon>
            <ContentCopyRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy link</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3000}
        onClose={() => setNotice('')}
        message={notice}
      />
    </>
  );
};
