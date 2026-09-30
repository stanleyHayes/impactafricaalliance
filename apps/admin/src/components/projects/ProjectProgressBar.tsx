import type { ProjectProgress } from '@iaa/shared';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import { skinned, tokenVar } from '../../theme/surfaces';

import { progressText } from './project-format';

/**
 * The track under the bar. Classic keeps its quiet grey; the other skins use
 * their own track (sunk in Neumorphism and Clay, tinted glass in Glass), which
 * the theme would give the bar if this did not set a colour.
 */
const trackSx = skinned({ bgcolor: 'action.hover' }, { bgcolor: tokenVar('trackBg') });

export interface ProjectProgressBarProps {
  progress: ProjectProgress;
  /** Compact for a table row; the header card uses the full size. */
  dense?: boolean;
}

/**
 * A project's progress as a bar and a line of text. The text always says what
 * the figure is made of, so a figure set by hand is never mistaken for a
 * count, and an empty project reads as "nothing to measure" rather than 0%.
 */
export const ProjectProgressBar = ({
  progress,
  dense = false,
}: ProjectProgressBarProps): JSX.Element => {
  const labelId = useId();
  const manual = progress.source === 'manual';
  return (
    <Box sx={{ minWidth: 0, width: '100%' }}>
      <LinearProgress
        variant="determinate"
        value={progress.value ?? 0}
        color={manual ? 'secondary' : 'primary'}
        aria-labelledby={labelId}
        sx={[
          {
            height: dense ? 6 : 8,
            borderRadius: 99,
            '& .MuiLinearProgress-bar': { borderRadius: 99 },
          },
          trackSx,
        ]}
      />
      <Typography
        id={labelId}
        variant="caption"
        color="text.secondary"
        component="p"
        sx={{ mt: 0.75, fontWeight: manual ? 650 : 500 }}
        noWrap={dense}
        title={dense ? progressText(progress) : undefined}
      >
        {progressText(progress)}
      </Typography>
    </Box>
  );
};
