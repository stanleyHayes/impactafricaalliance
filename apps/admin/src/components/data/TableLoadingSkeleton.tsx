import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

import { gridSx, skinned, tokenVar } from '../../theme/surfaces';

interface TableLoadingSkeletonProps {
  rows?: number;
  rowHeight?: number;
  columns?: number;
}

/**
 * Row-shaped skeleton used as the DataGrid loading overlay — favoured over a spinner.
 *
 * In a skin it is see-through, so the card or grid it loads inside keeps its
 * own material, and its rules and stripes are the skin's grid rules.
 */
export const TableLoadingSkeleton = ({
  rows = 10,
  rowHeight = 58,
  columns = 5,
}: TableLoadingSkeletonProps): JSX.Element => {
  const theme = useTheme();
  const line = alpha(theme.palette.primary.main, 0.06);
  return (
    <Box
      sx={skinned(
        { width: '100%', height: '100%', bgcolor: 'background.paper' },
        { bgcolor: 'transparent' },
      )}
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Stack
          key={rowIndex}
          direction="row"
          alignItems="center"
          spacing={2}
          sx={skinned(
            {
              height: rowHeight,
              px: 2,
              borderBottom: `1px solid ${line}`,
              '&:nth-of-type(even)': gridSx.stripe,
            },
            { borderBottom: `1px solid ${tokenVar('gridRule')}` },
          )}
        >
          <Skeleton variant="circular" width={28} height={28} sx={{ flexShrink: 0 }} />
          {Array.from({ length: columns }).map((_, colIndex) => {
            const width = [28, 22, 14, 20, 16, 18][colIndex % 6];
            return (
              <Skeleton
                key={colIndex}
                variant="rounded"
                height={14}
                sx={{ flexBasis: `${width}%`, borderRadius: 1 }}
              />
            );
          })}
          <Skeleton
            variant="rounded"
            width={76}
            height={28}
            sx={{ flexShrink: 0, ml: 'auto', borderRadius: 1.5 }}
          />
        </Stack>
      ))}
    </Box>
  );
};
