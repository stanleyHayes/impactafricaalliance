import { SOCIAL_LINKS } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import XIcon from '@mui/icons-material/X';
import YouTubeIcon from '@mui/icons-material/YouTube';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';

interface SocialLinksProps {
  color?: 'inherit' | 'primary';
}

const LINKS: ReadonlyArray<{ label: string; href: string; Icon: SvgIconComponent }> = [
  { label: 'LinkedIn', href: SOCIAL_LINKS.linkedin, Icon: LinkedInIcon },
  { label: 'Instagram', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
  { label: 'X (Twitter)', href: SOCIAL_LINKS.twitter, Icon: XIcon },
  { label: 'Facebook', href: SOCIAL_LINKS.facebook, Icon: FacebookIcon },
  { label: 'YouTube', href: SOCIAL_LINKS.youtube, Icon: YouTubeIcon },
  { label: 'WhatsApp', href: SOCIAL_LINKS.whatsapp, Icon: WhatsAppIcon },
];

/** Row of social icon links; opens each in a new tab with safe rel attributes. */
export const SocialLinks = ({ color = 'inherit' }: SocialLinksProps): JSX.Element => (
  <Stack direction="row" spacing={0.5}>
    {LINKS.map(({ label, href, Icon }) => (
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
