import type { ImpactStoryStatus } from '@iaa/shared';
import Chip, { type ChipProps } from '@mui/material/Chip';
import type { ReactElement } from 'react';

import { IMPACT_STORY_STATUS_OPTIONS } from '../../lib/select-options';

const COLOURS: Record<ImpactStoryStatus, ChipProps['color']> = {
  draft: 'default',
  'in-review': 'warning',
  published: 'success',
  archived: 'default',
};

/** A story's status in the words the rest of the console uses for it. */
export const StoryStatusChip = ({
  status,
  size = 'small',
}: {
  status: ImpactStoryStatus;
  size?: ChipProps['size'];
}): JSX.Element => {
  const option = IMPACT_STORY_STATUS_OPTIONS.find((candidate) => candidate.value === status);
  return (
    <Chip
      size={size}
      color={COLOURS[status]}
      variant={status === 'archived' ? 'outlined' : 'filled'}
      icon={(option?.icon as ReactElement | undefined) ?? undefined}
      label={option?.label ?? status}
      sx={{ fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
    />
  );
};
