import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/** One labelled input, the height a filled MUI text field occupies. */
const FieldSkeleton = ({ width = '100%' }: { width?: string }): JSX.Element => (
  <Box sx={{ width }}>
    <Skeleton variant="text" width={110} sx={{ fontSize: '0.75rem' }} />
    <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1.5 }} />
  </Box>
);

/**
 * The loading shape of a form page: the step rail and the bordered panel the
 * fields sit in.
 *
 * No header placeholder. A page's title, description and buttons are known
 * before the fetch, so they are rendered for real from the first frame —
 * showing a grey bar and then swapping it for the title is a change the reader
 * sees, and a change for nothing.
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
 * The loading shape of the events page: the view toggle and count, and the
 * month grid that opens by default. The header is real from the first frame.
 */
export const CalendarPageSkeleton = (): JSX.Element => (
  <Box>
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
 * The loading shape of the media library: the upload panel, and tiles on the
 * same grid and aspect ratio the pictures land on.
 */
export const MediaLibrarySkeleton = ({ tiles = 10 }: { tiles?: number }): JSX.Element => (
  <Box>
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
