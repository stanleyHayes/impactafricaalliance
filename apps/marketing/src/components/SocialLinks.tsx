import { SOCIAL_LINKS, type SiteSettingSocials } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import XIcon from '@mui/icons-material/X';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';

import { useSiteSettings } from '../lib/content-hooks';

interface SocialLinksProps {
  color?: 'inherit' | 'primary';
}

/**
 * Each channel names the settings key it is edited under, so the dashboard is
 * the source of truth. The constants stay as a fallback for the accounts that
 * predate site settings — and so the row is never empty while settings load.
 */
const CHANNELS: ReadonlyArray<{
  key: keyof SiteSettingSocials;
  label: string;
  Icon: SvgIconComponent;
  fallback?: string;
}> = [
  { key: 'linkedin', label: 'LinkedIn', Icon: LinkedInIcon, fallback: SOCIAL_LINKS.linkedin },
  { key: 'instagram', label: 'Instagram', Icon: InstagramIcon, fallback: SOCIAL_LINKS.instagram },
  { key: 'x', label: 'X (Twitter)', Icon: XIcon, fallback: SOCIAL_LINKS.twitter },
  { key: 'facebook', label: 'Facebook', Icon: FacebookIcon, fallback: SOCIAL_LINKS.facebook },
  { key: 'tiktok', label: 'TikTok', Icon: MusicNoteRoundedIcon, fallback: SOCIAL_LINKS.tiktok },
  { key: 'whatsapp', label: 'WhatsApp community', Icon: WhatsAppIcon },
];

/** Row of social icon links; opens each in a new tab with safe rel attributes. */
export const SocialLinks = ({ color = 'inherit' }: SocialLinksProps): JSX.Element => {
  const { data: site } = useSiteSettings();
  const links = CHANNELS.map((channel) => ({
    ...channel,
    href: site?.socials?.[channel.key] ?? channel.fallback,
  })).filter((channel): channel is typeof channel & { href: string } => Boolean(channel.href));

  return (
    <Stack direction="row" spacing={0.5}>
      {links.map(({ label, href, Icon }) => (
        <IconButton
          key={label}
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          color={color}
          size="small"
        >
          <Icon fontSize="small" />
        </IconButton>
      ))}
    </Stack>
  );
};
