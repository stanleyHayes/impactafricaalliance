import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef, type GridRowsProp } from '@mui/x-data-grid';
import { useState, type ReactNode } from 'react';

import { TableLoadingSkeleton } from './TableLoadingSkeleton';

interface DataTableProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  /** Rendered (centered) when not loading and there are no rows. */
  empty?: ReactNode;
  height?: number;
  pageSize?: number;
  /** Show the quick-search toolbar (default true). */
  searchable?: boolean;
  searchPlaceholder?: string;
}

interface ResolvedDataTableProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading: boolean;
  empty?: ReactNode;
  height: number;
  pageSize: number;
  searchable: boolean;
  searchPlaceholder: string;
}

const resolveProps = (props: DataTableProps): ResolvedDataTableProps => ({
  rows: props.rows,
  columns: props.columns,
  loading: props.loading ?? false,
  empty: props.empty,
  height: props.height ?? 620,
  pageSize: props.pageSize ?? 25,
  searchable: props.searchable ?? true,
  searchPlaceholder: props.searchPlaceholder ?? 'Search…',
});

/**
 * Shared, on-brand DataGrid shell: quick-search toolbar, a clean rounded card with
 * a strong header, readable rows, visible keyboard focus, and a tidy paginated footer.
 */
export const DataTable = (props: DataTableProps): JSX.Element => {
  const { rows, columns, loading, empty, height, pageSize, searchable, searchPlaceholder } =
    resolveProps(props);
  const theme = useTheme();
  const green = theme.palette.primary.main;
  const gold = theme.palette.secondary.main;
  const [search, setSearch] = useState('');

  const containerSx = {
    bgcolor: 'background.paper',
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    overflow: 'hidden',
  } as const;

  if (!loading && rows.length === 0 && empty) {
    return (
      <Box
        sx={{
          ...containerSx,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 480,
        }}
      >
        {empty}
      </Box>
    );
  }

  const quickFilterValues = search.trim() ? search.trim().split(/\s+/) : [];

  return (
    <Box sx={{ ...containerSx, height, display: 'flex', flexDirection: 'column' }}>
      {searchable && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={1.25}
          sx={{
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            flexShrink: 0,
          }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            sx={{ width: { xs: '100%', sm: 360 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label="Clear search"
                      onClick={() => setSearch('')}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 650, whiteSpace: 'nowrap' }}
          >
            {rows.length.toLocaleString()} {rows.length === 1 ? 'record' : 'records'}
          </Typography>
        </Stack>
      )}

      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          rowHeight={58}
          columnHeaderHeight={54}
          disableRowSelectionOnClick
          disableColumnMenu
          filterModel={{ items: [], quickFilterValues }}
          initialState={{ pagination: { paginationModel: { pageSize } } }}
          pageSizeOptions={[25, 50, 100]}
          slots={{
            loadingOverlay: () => <TableLoadingSkeleton rowHeight={58} rows={10} />,
            noRowsOverlay: () => (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', p: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  {search ? 'No matches for your search.' : 'No records to display.'}
                </Typography>
              </Stack>
            ),
            noResultsOverlay: () => (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', p: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  No matches for “{search}”.
                </Typography>
              </Stack>
            ),
          }}
          sx={{
            border: 'none',
            '--DataGrid-rowBorderColor': alpha(green, 0.08),
            fontSize: '0.875rem',
            color: 'text.primary',

            // Header: strong, on-brand, with a gold accent underline.
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'common.black',
              borderBottom: `2px solid ${gold}`,
            },
            '& .MuiDataGrid-columnHeader': {
              px: 2,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'common.white',
            },
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              justifyContent: columns.length > 0 && columns[0]?.flex ? 'flex-start' : undefined,
            },
            '& .MuiDataGrid-columnSeparator': { display: 'none' },
            '& .MuiDataGrid-sortIcon': { color: 'common.white' },
            '& .MuiDataGrid-iconButtonContainer': { color: 'common.white' },

            // Cells + rows: airy, zebra-striped, with a calm hover.
            '& .MuiDataGrid-cell': {
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              px: 2,
            },
            '& .MuiDataGrid-row': {
              transition: theme.transitions.create('background-color', {
                duration: theme.transitions.duration.shortest,
              }),
              '&:nth-of-type(even)': { bgcolor: alpha(green, 0.02) },
            },
            '& .MuiDataGrid-row:hover': { bgcolor: alpha(green, 0.06) },
            '& .MuiDataGrid-row.Mui-selected': { bgcolor: alpha(green, 0.1) },
            '& .MuiDataGrid-row.Mui-selected:hover': { bgcolor: alpha(green, 0.12) },

            // Restore visible, on-brand focus indicators for keyboard users.
            '& .MuiDataGrid-cell:focus-visible, & .MuiDataGrid-cell:focus-within': {
              outline: `2px solid ${alpha(gold, 0.8)}`,
              outlineOffset: '-2px',
            },
            '& .MuiDataGrid-columnHeader:focus-visible, & .MuiDataGrid-columnHeader:focus-within': {
              outline: `2px solid ${alpha(gold, 0.9)}`,
              outlineOffset: '-2px',
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
              outline: 'none',
            },

            // Footer: detached by a hairline, clean pagination.
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
              px: 1.5,
            },
            '& .MuiTablePagination-root': {
              color: 'text.secondary',
              fontSize: '0.8125rem',
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontWeight: 500,
            },
            '& .MuiDataGrid-overlay': { bgcolor: 'transparent' },

            // Slimmer, on-brand scrollbar.
            '& .MuiDataGrid-virtualScroller': {
              '&::-webkit-scrollbar': { width: 10, height: 10 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: alpha(green, 0.18),
                borderRadius: 8,
                border: '2px solid transparent',
                backgroundClip: 'content-box',
              },
              '&::-webkit-scrollbar-thumb:hover': { backgroundColor: alpha(green, 0.32) },
            },
          }}
        />
      </Box>
    </Box>
  );
};
