import type { SvgIconComponent } from '@mui/icons-material';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';

/** Brand icon for each flagship program, keyed by pillar/program slug. */
export const PROGRAM_ICONS: Record<string, SvgIconComponent> = {
  'digital-skills': CodeRoundedIcon,
  'stem-learning': ScienceRoundedIcon,
  'youth-inclusion': WorkOutlineRoundedIcon,
  'women-empowerment': Diversity3RoundedIcon,
};

export const programIcon = (key: string): SvgIconComponent => PROGRAM_ICONS[key] ?? CodeRoundedIcon;
