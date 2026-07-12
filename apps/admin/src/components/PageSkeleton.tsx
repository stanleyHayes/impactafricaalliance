import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

interface PageSkeletonProps {
  /** Number of content cards to mirror below the header. */
  cards?: number;
}

/** Page-level skeleton that mirrors a standard admin page header + card grid. */
export const PageSkeleton = ({ cards = 3 }: PageSkeletonProps): JSX.Element => (
  <Box sx={{ width: '100%' }}>
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
      sx={{ mb: 3, pb: 2.5 }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
        <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2.5 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="rounded" width={180} height={28} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rounded" width={260} height={16} sx={{ borderRadius: 1, mt: 0.75 }} />
        </Box>
      </Stack>
      <Skeleton
        variant="rounded"
        width={120}
        height={40}
        sx={{ borderRadius: 2.5, width: { xs: '100%', sm: 120 } }}
      />
    </Stack>

    <Grid container spacing={3}>
      {Array.from({ length: cards }).map((_, index) => (
        <Grid key={index} size={{ xs: 12, md: 6, lg: 4 }}>
          <Box
            sx={{
              height: 160,
              p: 2.5,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: (t) => `1px solid ${t.palette.divider}`,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="rounded" width="60%" height={16} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rounded" width="40%" height={12} sx={{ borderRadius: 1, mt: 0.5 }} />
              </Box>
            </Stack>
            <Skeleton variant="rounded" width="45%" height={32} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rounded" width="80%" height={12} sx={{ borderRadius: 1, mt: 1.5 }} />
          </Box>
        </Grid>
      ))}
    </Grid>
  </Box>
);
