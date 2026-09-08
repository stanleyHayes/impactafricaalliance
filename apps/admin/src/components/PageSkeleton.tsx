import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

/**
 * The loading shape of PageHeader.
 *
 * It repeats that component's own spacing, icon size and bottom rule rather
 * than approximating them, so the page does not shift downward the moment the
 * real title arrives.
 */
export const PageHeaderSkeleton = ({
  icon = true,
  description = true,
  action = false,
}: {
  icon?: boolean;
  description?: boolean;
  action?: boolean;
}): JSX.Element => {
  const theme = useTheme();
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
      sx={{
        mb: 3,
        pb: 2.5,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.11)}`,
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, flexGrow: 1 }}>
        {icon && (
          <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2.5, flexShrink: 0 }} />
        )}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Skeleton variant="text" width={210} sx={{ fontSize: '1.5rem' }} />
          {description && <Skeleton variant="text" width="55%" sx={{ fontSize: '0.875rem' }} />}
        </Box>
      </Stack>
      {action && (
        <Skeleton
          variant="rounded"
          height={40}
          sx={{ borderRadius: 2.5, width: { xs: '100%', sm: 150 }, flexShrink: 0 }}
        />
      )}
    </Stack>
  );
};

/** One labelled input, the height a filled MUI text field occupies. */
const FieldSkeleton = ({ width = '100%' }: { width?: string }): JSX.Element => (
  <Box sx={{ width }}>
    <Skeleton variant="text" width={110} sx={{ fontSize: '0.75rem' }} />
    <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1.5 }} />
  </Box>
);

/**
 * The loading shape of a form page: the back link, the header, the step rail
 * and the bordered panel the fields sit in.
 *
 * These pages used to borrow the card-grid skeleton, which drew three tiles
 * where a full-width form was about to appear — the page visibly rebuilt
 * itself rather than filling in.
 */
export const FormPageSkeleton = ({
  backLink = false,
  steps = false,
  fields = 4,
}: {
  backLink?: boolean;
  steps?: boolean;
  fields?: number;
}): JSX.Element => (
  <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
    {backLink && <Skeleton variant="text" width={150} sx={{ mb: 2, fontSize: '0.875rem' }} />}
    <PageHeaderSkeleton />
    {steps && <Skeleton variant="rounded" height={64} sx={{ borderRadius: 2.5, mb: 3 }} />}
    <Box
      sx={{
        mt: 3,
        p: { xs: 2.5, md: 4 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={3}>
        {Array.from({ length: fields }, (_, index) => (
          <FieldSkeleton key={index} width={index % 3 === 2 ? '60%' : '100%'} />
        ))}
      </Stack>
    </Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
      <Skeleton variant="rounded" width={110} height={40} sx={{ borderRadius: 2.5 }} />
      <Skeleton variant="rounded" width={130} height={40} sx={{ borderRadius: 2.5 }} />
    </Stack>
  </Box>
);

/**
 * The loading shape of the events page: header, the view toggle and count, and
 * the month grid that opens by default.
 */
export const CalendarPageSkeleton = (): JSX.Element => (
  <Box>
    <PageHeaderSkeleton action />
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
      <Skeleton variant="rounded" width={196} height={34} sx={{ borderRadius: 1.5 }} />
      <Skeleton variant="text" width={70} sx={{ fontSize: '0.875rem' }} />
    </Stack>
    <Skeleton variant="rounded" height={54} sx={{ borderRadius: 2.5, mb: 1.5 }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
      {Array.from({ length: 35 }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={96} sx={{ borderRadius: 2 }} />
      ))}
    </Box>
  </Box>
);

/**
 * The loading shape of the media library: header, the upload panel, and tiles
 * on the same grid and aspect ratio the pictures land on.
 */
export const MediaLibrarySkeleton = ({ tiles = 10 }: { tiles?: number }): JSX.Element => (
  <Box>
    <PageHeaderSkeleton />
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        mb: 3,
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Skeleton variant="text" width={140} sx={{ fontSize: '0.75rem' }} />
      <Skeleton variant="rounded" height={92} sx={{ borderRadius: 2 }} />
    </Box>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
        gap: 2,
      }}
    >
      {Array.from({ length: tiles }, (_, index) => (
        <Box
          key={index}
          sx={{ border: 1, borderColor: 'divider', borderRadius: 2.5, overflow: 'hidden' }}
        >
          <Skeleton variant="rectangular" sx={{ aspectRatio: '4 / 3', height: 'auto' }} />
          <Box sx={{ p: 1.25 }}>
            <Skeleton variant="text" sx={{ fontSize: '0.8rem' }} />
            <Skeleton variant="text" width="60%" sx={{ fontSize: '0.7rem' }} />
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);
