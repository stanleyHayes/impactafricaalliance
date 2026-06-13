import type { SvgIconComponent } from '@mui/icons-material';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

/**
 * Maps known stat keys to meaningful icons. Unknown keys fall back to a
 * generic impact icon so CMS-added stats still render sensibly.
 */
export const getStatIcon = (key: string): SvgIconComponent => {
  switch (key) {
    case 'youth-trained':
    case 'youth':
      return GroupsRoundedIcon;
    case 'countries':
      return PublicRoundedIcon;
    case 'programs':
      return FlagRoundedIcon;
    case 'partners':
      return HandshakeRoundedIcon;
    case 'employment-rate':
      return TrendingUpRoundedIcon;
    case 'women':
      return Diversity3RoundedIcon;
    default:
      return TrackChangesRoundedIcon;
  }
};
