import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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
  <Grid container spacing={3} justifyContent="center">
    {Array.from({ length: count }, (_, index) => (
      <Grid key={index} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
        <Skeleton variant="rounded" height={64} sx={{ borderRadius: 2 }} />
      </Grid>
    ))}
  </Grid>
);
