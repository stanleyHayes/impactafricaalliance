import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useDelayedFlag } from '../use-delayed-flag';

import { ScreenColumn } from './ScreenParts';

/**
 * The shape of a cover slide while the form loads: eyebrow, heading, a few
 * lines, the Begin button. After a few seconds it says why it is slow, since
 * the API may be waking from sleep.
 */
export const LoadingScreen = (): JSX.Element => {
  const slow = useDelayedFlag(true);
  return (
    <ScreenColumn>
      <Stack
        spacing={1.5}
        sx={{
          '@media (prefers-reduced-motion: reduce)': {
            '& .MuiSkeleton-root, & .MuiSkeleton-root::after': { animation: 'none' },
          },
        }}
      >
        <Typography role="status" sx={{ color: 'text.secondary', minHeight: '1.7em' }}>
          {slow
            ? 'Waking the server. This can take up to a minute the first time.'
            : 'Loading the application…'}
        </Typography>
        <Stack spacing={1.5} aria-hidden="true">
          <Skeleton width={120} height={20} />
          <Skeleton width="90%" height={56} />
          <Skeleton width="65%" height={56} />
          <Skeleton width="100%" height={24} sx={{ mt: 2 }} />
          <Skeleton width="95%" height={24} />
          <Skeleton width="70%" height={24} />
          <Skeleton variant="rounded" width={140} height={52} sx={{ mt: 3, borderRadius: 999 }} />
        </Stack>
      </Stack>
    </ScreenColumn>
  );
};
