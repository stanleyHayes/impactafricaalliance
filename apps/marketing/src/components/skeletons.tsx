import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/** Skeleton placeholder for a single content card (matches CardContent layout). */
export const CardSkeleton = (): JSX.Element => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <Skeleton variant="rectangular" height={180} />
    <CardContent>
      <Skeleton width="40%" height={20} />
      <Skeleton width="90%" height={28} sx={{ mt: 1 }} />
      <Skeleton width="100%" />
      <Skeleton width="80%" />
    </CardContent>
  </Card>
);

interface CardGridSkeletonProps {
  count?: number;
  columns?: number;
}

/** A responsive grid of card skeletons, shown while a collection loads. */
export const CardGridSkeleton = ({
  count = 3,
  columns = 3,
}: CardGridSkeletonProps): JSX.Element => (
  <Grid container spacing={3}>
    {Array.from({ length: count }, (_, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: 12 / columns }}>
        <CardSkeleton />
      </Grid>
    ))}
  </Grid>
);

/** Skeleton for the animated impact-stat cards. */
export const StatsSkeleton = (): JSX.Element => (
  <Grid container spacing={3}>
    {Array.from({ length: 5 }, (_, index) => (
      <Grid key={index} size={{ xs: 6, md: 4 }}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack alignItems="center" spacing={1.5}>
              <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2.5 }} />
              <Skeleton variant="text" width={90} height={54} />
              <Skeleton variant="text" width={130} height={20} />
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

/** Skeleton for the partner logo grid. */
export const PartnerLogosSkeleton = ({ count = 5 }: { count?: number }): JSX.Element => (
  <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
    {Array.from({ length: count }, (_, index) => (
      <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
        <Skeleton variant="rounded" height={64} sx={{ borderRadius: 2 }} />
      </Grid>
    ))}
  </Grid>
);

/** Shared route fallback reserves space for the hero and content. */
export const PageSkeleton = (): JSX.Element => (
  <Container
    role="status"
    aria-label="Loading page"
    sx={{
      py: { xs: 5, md: 8 },
      '@media (prefers-reduced-motion: reduce)': {
        '& .MuiSkeleton-root, & .MuiSkeleton-root::after': { animation: 'none' },
      },
    }}
  >
    <Box aria-hidden="true">
      <Skeleton width={120} height={24} />
      <Skeleton width="75%" height={80} />
      <Skeleton width="50%" height={32} />
      <Skeleton variant="rounded" height={300} sx={{ my: 4, borderRadius: 3 }} />
      <CardGridSkeleton />
    </Box>
  </Container>
);

export const CalendarSkeleton = (): JSX.Element => (
  <Box
    role="status"
    aria-label="Loading calendar"
    sx={{
      '@media (prefers-reduced-motion: reduce)': { '& .MuiSkeleton-root': { animation: 'none' } },
    }}
  >
    <Skeleton width={220} height={42} sx={{ mb: 2 }} />
    <Box aria-hidden="true" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
      {Array.from({ length: 35 }, (_, index) => (
        <Skeleton key={index} variant="rounded" sx={{ height: { xs: 72, md: 142 } }} />
      ))}
    </Box>
  </Box>
);

export const EventListSkeleton = (): JSX.Element => (
  <Stack spacing={3} role="status" aria-label="Loading events">
    {Array.from({ length: 3 }, (_, index) => (
      <Box
        key={index}
        aria-hidden="true"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '34% 1fr' },
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Skeleton variant="rectangular" sx={{ height: { xs: 200, md: 280 } }} />
        <Box sx={{ p: 3 }}>
          <Skeleton width="45%" height={22} />
          <Skeleton width="90%" height={42} />
          <Skeleton width="65%" height={26} />
          <Skeleton width="100%" sx={{ display: { xs: 'none', md: 'block' } }} />
          <Skeleton variant="rounded" width={140} height={40} sx={{ mt: 3 }} />
        </Box>
      </Box>
    ))}
  </Stack>
);
