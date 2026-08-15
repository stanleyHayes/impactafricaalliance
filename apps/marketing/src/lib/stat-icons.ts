import type { SvgIconComponent } from '@mui/icons-material';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

const BY_KEY: Record<string, SvgIconComponent> = {
  'youth-trained': GroupsRoundedIcon,
  youth: GroupsRoundedIcon,
  countries: PublicRoundedIcon,
  programs: FlagRoundedIcon,
  programmes: FlagRoundedIcon,
  partners: HandshakeRoundedIcon,
  'employment-rate': TrendingUpRoundedIcon,
  women: Diversity3RoundedIcon,
};

/**
 * Keyword patterns matched against the stat's label, most specific first.
 * Ordered before the key lookup because a stat's `key` is effectively immutable
 * once created while its label is edited freely in the CMS — a stat keyed
 * `programs` and relabelled "Women" should show the women icon, not a flag.
 */
const BY_LABEL: readonly (readonly [RegExp, SvgIconComponent])[] = [
  [/\b(women|woman|girls?)\b/i, Diversity3RoundedIcon],
  [/\b(youth|young|students?|learners?)\b/i, GroupsRoundedIcon],
  [/\b(countr(y|ies)|nations?|regions?)\b/i, PublicRoundedIcon],
  [/\b(partners?|allies)\b|collaborat/i, HandshakeRoundedIcon],
  [/\b(programs?|programmes?|initiatives?)\b/i, FlagRoundedIcon],
  [/\b(rate|growth|employment|jobs?)\b/i, TrendingUpRoundedIcon],
];

/**
 * Maps a stat to a meaningful icon: label keywords first, then the stat key,
 * then a generic impact icon so CMS-added stats always render sensibly.
 */
export const getStatIcon = (key: string, label?: string): SvgIconComponent => {
  if (label) {
    const match = BY_LABEL.find(([pattern]) => pattern.test(label));
    if (match) {
      return match[1];
    }
  }
  return BY_KEY[key] ?? TrackChangesRoundedIcon;
};
