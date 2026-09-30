import { isTeamSocialEnabled } from '@iaa/shared';
import type { TeamMember, TeamSocialsEnabled, TeamSocialField } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import FacebookIcon from '@mui/icons-material/Facebook';
import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import XIcon from '@mui/icons-material/X';

/** Rendered in this order, and only for the links a member actually has. */
const MEMBER_SOCIALS: ReadonlyArray<{
  field: TeamSocialField;
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

/** Titles that may lead a name but are not part of it. */
const HONORIFICS = new Set([
  'amb',
  'dr',
  'prof',
  'hon',
  'rev',
  'mr',
  'mrs',
  'ms',
  'miss',
  'sir',
  'engr',
  'barr',
]);

/**
 * Given names that are read together with the name after them. "Nana" is an
 * Akan title used as part of the given name ("Nana Ama"), so on its own it
 * would give two people the same card name.
 */
const JOINED_GIVEN_NAMES = new Set(['nana', 'maame', 'papa']);

/**
 * The name shown over a team portrait: the first name only, so every card
 * carries a name of about the same length and none wraps over the face.
 * Leading titles ("Amb.", "Dr") are skipped, and a joined given name keeps the
 * name after it. The full name is still what screen readers and the profile
 * page use.
 */
export const cardName = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const start = words.findIndex((word) => !HONORIFICS.has(word.replace(/\.$/, '').toLowerCase()));
  const given = words.slice(start === -1 ? 0 : start);
  const [first = name.trim(), second] = given;
  return second && JOINED_GIVEN_NAMES.has(first.toLowerCase()) ? `${first} ${second}` : first;
};

export const memberInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/**
 * The links to show for one member.
 *
 * A link needs both a value on the member and its channel switched on for the
 * site as a whole. The address stays on the team record either way, so turning
 * a channel back on shows it again without anyone re-entering anything.
 */
export const memberSocials = (member: TeamMember, enabled?: TeamSocialsEnabled) =>
  MEMBER_SOCIALS.flatMap(({ field, label, Icon }) => {
    if (!isTeamSocialEnabled(enabled, field)) return [];
    const href = member[field];
    return href && /^https?:\/\//i.test(href) ? [{ field, label, Icon, href }] : [];
  });
