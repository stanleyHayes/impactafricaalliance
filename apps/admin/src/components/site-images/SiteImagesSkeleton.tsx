import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

import { surfaceSx } from '../../theme/surfaces';

/** The grid the slot cards sit on, shared with the loaded page so nothing moves. */
export const SLOT_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
  gap: 2,
} as const;

const CardSkeleton = (): JSX.Element => (
  <Box sx={{ ...surfaceSx.card, borderRadius: 2.5, overflow: 'hidden' }}>
    {/* The picture frame is one height on every card (SiteImageSlotCard). */}
    <Skeleton variant="rectangular" height={190} />
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="70%" sx={{ fontSize: '1rem' }} />
      <Skeleton variant="text" width="40%" sx={{ fontSize: '0.75rem' }} />
      <Skeleton variant="text" sx={{ fontSize: '0.875rem' }} />
      <Skeleton variant="text" width="85%" sx={{ fontSize: '0.875rem', mb: 1.5 }} />
      <Skeleton variant="rounded" width={110} height={30} sx={{ borderRadius: 2 }} />
    </Box>
  </Box>
);

/**
 * The loading shape of the Site images page: page sections holding cards,
 * on the same grid as the loaded board. The header is real from the start.
 */
export const SiteImagesSkeleton = ({ sections = 2 }: { sections?: number }): JSX.Element => (
  <Stack spacing={3} aria-busy="true" aria-label="Loading site images">
    {Array.from({ length: sections }, (_, section) => (
      <Box key={section} sx={{ ...surfaceSx.card, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 2.5, md: 3.5 }, py: 2.5, borderBottom: 1, borderColor: 'divider' }}>
          <Skeleton variant="text" width={160} sx={{ fontSize: '1.25rem' }} />
          <Skeleton variant="text" width={220} sx={{ fontSize: '0.875rem' }} />
        </Box>
        <Box sx={{ p: { xs: 2.5, md: 3.5 }, ...SLOT_GRID_SX }}>
          {Array.from({ length: 3 }, (_, card) => (
            <CardSkeleton key={card} />
          ))}
        </Box>
      </Box>
    ))}
  </Stack>
);
