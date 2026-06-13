import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/** Vertical list of skeleton cards used while admin lists load. */
export const CardListSkeleton = ({ count = 4 }: { count?: number }): JSX.Element => (
  <Stack spacing={2}>
    {Array.from({ length: count }, (_, index) => (
      <Skeleton key={index} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
    ))}
  </Stack>
);
