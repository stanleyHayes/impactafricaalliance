import type { TeamMember } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import FacebookIcon from '@mui/icons-material/Facebook';
import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import XIcon from '@mui/icons-material/X';

type SocialField =
  | 'websiteUrl'
  | 'linkedInUrl'
  | 'githubUrl'
  | 'xUrl'
  | 'instagramUrl'
  | 'facebookUrl'
  | 'tiktokUrl';

/** Rendered in this order, and only for the links a member actually has. */
const MEMBER_SOCIALS: ReadonlyArray<{
  field: SocialField;
  label: string;
  Icon: SvgIconComponent;
}> = [
  { field: 'websiteUrl', label: 'Website', Icon: LanguageRoundedIcon },
  { field: 'linkedInUrl', label: 'LinkedIn', Icon: LinkedInIcon },
  { field: 'githubUrl', label: 'GitHub', Icon: GitHubIcon },
  { field: 'xUrl', label: 'X', Icon: XIcon },
  { field: 'instagramUrl', label: 'Instagram', Icon: InstagramIcon },
  { field: 'facebookUrl', label: 'Facebook', Icon: FacebookIcon },
  { field: 'tiktokUrl', label: 'TikTok', Icon: MusicNoteRoundedIcon },
];

export const memberInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export const memberSocials = (member: TeamMember) =>
  MEMBER_SOCIALS.flatMap(({ field, label, Icon }) => {
    const href = member[field];
    return href && /^https?:\/\//i.test(href) ? [{ field, label, Icon, href }] : [];
  });
