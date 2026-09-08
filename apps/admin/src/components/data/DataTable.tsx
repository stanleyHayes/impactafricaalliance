import CloseIcon from '@mui/icons-material/Close';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef, type GridRowModel, type GridRowsProp } from '@mui/x-data-grid';
import { useMemo, useState, type ReactNode } from 'react';

import { TableLoadingSkeleton } from './TableLoadingSkeleton';
import type { ViewMode } from './useViewMode';

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 52;
const FOOTER_HEIGHT = 52;
const TOOLBAR_HEIGHT = 74;
const MIN_VISIBLE_ROWS = 3;
const LOADING_ROWS = 8;
const GRID_TEMPLATE = 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))';

export interface DataTableFilterOption {
  value: string;
  label: string;
}

export interface DataTableFilter {
  /** Row field matched with strict string equality. */
  field: string;
  label: string;
  options: DataTableFilterOption[];
}

interface DataTableProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  /** Rendered (centered) when not loading and there are no rows. */
  empty?: ReactNode;
  /** Maximum height of the table card; the table shrinks to fit its rows (default 640). */
  height?: number;
  pageSize?: number;
  /** Show the quick-search toolbar (default true). */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Dropdown filters rendered in the toolbar and applied to both views. */
  filters?: DataTableFilter[];
  /** 'grid' renders rows as cards via renderCard instead of the data grid. */
  view?: ViewMode;
  /** Card renderer used in grid view. */
  renderCard?: (row: GridRowModel) => ReactNode;
  /** Extra content (e.g. a ViewToggle) rendered at the right end of the toolbar. */
  toolbarEnd?: ReactNode;
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
  filters: DataTableFilter[];
  view: ViewMode;
  renderCard?: (row: GridRowModel) => ReactNode;
  toolbarEnd?: ReactNode;
}

const resolveProps = (props: DataTableProps): ResolvedDataTableProps => ({
  rows: props.rows,
  columns: props.columns,
  loading: props.loading ?? false,
  empty: props.empty,
  height: props.height ?? 640,
  pageSize: props.pageSize ?? 25,
  searchable: props.searchable ?? true,
  searchPlaceholder: props.searchPlaceholder ?? 'Search…',
  filters: props.filters ?? [],
  view: props.view ?? 'table',
  renderCard: props.renderCard,
  toolbarEnd: props.toolbarEnd,
});

/** Shrinks the card to fit the row count, capped at the caller's max height. */
const computeHeight = (
  rowCount: number,
  loading: boolean,
  showToolbar: boolean,
  maxHeight: number,
): number => {
  const visibleRows = loading ? LOADING_ROWS : Math.max(rowCount, MIN_VISIBLE_ROWS);
  const content =
    HEADER_HEIGHT + visibleRows * ROW_HEIGHT + FOOTER_HEIGHT + (showToolbar ? TOOLBAR_HEIGHT : 0);
  return Math.min(maxHeight, content);
};

/** Applies active dropdown filters: every selected value must equal the row field. */
const applyFilters = (
  rows: GridRowsProp,
  filters: DataTableFilter[],
  values: Record<string, string>,
): GridRowsProp => {
  const active = filters.filter((filter) => values[filter.field]);
  if (active.length === 0) {
    return rows;
  }
  return rows.filter((row) =>
    active.every((filter) => String(row[filter.field] ?? '') === values[filter.field]),
  );
};

/** Quick-filter equivalent for the card grid: every search word must appear in the row. */
const filterRows = (rows: GridRowsProp, search: string): GridRowsProp => {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return rows;
  }
  return rows.filter((row) => {
    const haystack = JSON.stringify(row).toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
};

/** Theme-aware grid chrome: tinted header with readable titles in every preset and mode. */
const buildGridSx = (theme: Theme): SxProps<Theme> => {
  const green = theme.palette.primary.main;
  const gold = theme.palette.secondary.main;
  return {
    border: 'none',
    '--DataGrid-rowBorderColor': alpha(green, 0.08),
    fontSize: '0.875rem',
    color: 'text.primary',

    // Header: subtle brand tint with high-contrast titles and a gold accent underline.
    '& .MuiDataGrid-columnHeaders': {
      bgcolor: alpha(green, 0.07),
      borderBottom: `1px solid ${alpha(green, 0.18)}`,
    },
    '& .MuiDataGrid-columnHeader': { px: 2 },
    '& .MuiDataGrid-columnHeaderTitle': {
      fontSize: '0.75rem',
      fontWeight: 800,
      letterSpacing: '0.01em',
      textTransform: 'none',
      color: 'text.primary',
    },
    '& .MuiDataGrid-columnSeparator': { display: 'none' },
    '& .MuiDataGrid-sortIcon': { color: 'text.secondary' },
    '& .MuiDataGrid-iconButtonContainer': { color: 'text.secondary' },

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
  };
};

interface TableToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  searchable: boolean;
  placeholder: string;
  filters: DataTableFilter[];
  filterValues: Record<string, string>;
  onFilterChange: (field: string, value: string) => void;
  onClearFilters: () => void;
  recordCount: number;
  end?: ReactNode;
}

/** Search field + filter dropdowns + record count + optional trailing control. */
const TableToolbar = ({
  search,
  onSearch,
  searchable,
  placeholder,
  filters,
  filterValues,
  onFilterChange,
  onClearFilters,
  recordCount,
  end,
}: TableToolbarProps): JSX.Element => {
  const hasActiveFilters = filters.some((filter) => filterValues[filter.field]);
  const showControls = searchable || filters.length > 0;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.25}
      sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        alignItems="center"
        sx={{ flexWrap: 'wrap', rowGap: 1.25, flexGrow: 1 }}
      >
        {searchable && (
          <TextField
            size="small"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={placeholder}
            sx={{ width: { xs: '100%', sm: 280 }, flexGrow: { sm: 1 }, maxWidth: { sm: 420 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="Clear search" onClick={() => onSearch('')}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        )}
        {filters.map((filter) => (
          <TextField
            key={filter.field}
            select
            size="small"
            label={filter.label}
            value={filterValues[filter.field] ?? ''}
            onChange={(event) => onFilterChange(filter.field, event.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            {filter.options.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                sx={{ textTransform: 'capitalize' }}
              >
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        ))}
        {hasActiveFilters && (
          <Chip
            size="small"
            label="Clear filters"
            variant="outlined"
            onClick={onClearFilters}
            onDelete={onClearFilters}
            deleteIcon={<FilterAltOffIcon />}
            sx={{ borderRadius: 2 }}
          />
        )}
        {!showControls && <Box sx={{ display: { xs: 'none', sm: 'block' } }} />}
      </Stack>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ alignSelf: { xs: 'flex-end', sm: 'center' }, flexShrink: 0 }}
      >
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 650, whiteSpace: 'nowrap' }}
        >
          {recordCount.toLocaleString()} {recordCount === 1 ? 'record' : 'records'}
        </Typography>
        {end}
      </Stack>
    </Stack>
  );
};

interface CardGridProps {
  rows: GridRowsProp;
  renderCard?: (row: GridRowModel) => ReactNode;
  loading: boolean;
  empty?: ReactNode;
  filtered: boolean;
}

/** Responsive card grid used in grid view, with skeleton loading + empty states. */
const CardGrid = ({ rows, renderCard, loading, empty, filtered }: CardGridProps): JSX.Element => {
  if (loading) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: 2, p: 2 }}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} variant="rectangular" height={148} sx={{ borderRadius: 2.5 }} />
        ))}
      </Box>
    );
  }
  if (rows.length === 0) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 260, p: 3 }}>
        {filtered ? (
          <Typography variant="body2" color="text.secondary">
            No records match the current search or filters.
          </Typography>
        ) : (
          empty
        )}
      </Stack>
    );
  }
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: 2, p: 2 }}>
      {rows.map((row, index) => (
        <Box key={String(row.id ?? index)} sx={{ minWidth: 0 }}>
          {renderCard?.(row)}
        </Box>
      ))}
    </Box>
  );
};

/**
 * Shared list shell: quick-search + dropdown-filter toolbar, a theme-aware DataGrid
 * that shrinks to fit its rows, and an optional responsive card grid.
 */
export const DataTable = (props: DataTableProps): JSX.Element => {
  const {
    rows,
    columns,
    loading,
    empty,
    height,
    pageSize,
    searchable,
    searchPlaceholder,
    filters,
    view,
    renderCard,
    toolbarEnd,
  } = resolveProps(props);
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const showToolbar = searchable || Boolean(toolbarEnd) || filters.length > 0;
  const filteredRows = useMemo(
    () => applyFilters(rows, filters, filterValues),
    [rows, filters, filterValues],
  );
  const cardRows = useMemo(() => filterRows(filteredRows, search), [filteredRows, search]);
  const quickFilterValues = useMemo(
    () => (search.trim() ? search.trim().split(/\s+/) : []),
    [search],
  );
  const isFiltered = Boolean(search.trim()) || filters.some((filter) => filterValues[filter.field]);

  const setFilterValue = (field: string, value: string): void =>
    setFilterValues((prev) => ({ ...prev, [field]: value }));

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
          minHeight: 420,
        }}
      >
        {empty}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...containerSx,
        display: 'flex',
        flexDirection: 'column',
        height:
          view === 'table'
            ? computeHeight(filteredRows.length, loading, showToolbar, height)
            : undefined,
      }}
    >
      {showToolbar && (
        <TableToolbar
          search={search}
          onSearch={setSearch}
          searchable={searchable}
          placeholder={searchPlaceholder}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={setFilterValue}
          onClearFilters={() => setFilterValues({})}
          recordCount={view === 'grid' ? cardRows.length : filteredRows.length}
          end={toolbarEnd}
        />
      )}

      {view === 'grid' ? (
        <CardGrid
          rows={cardRows}
          renderCard={renderCard}
          loading={loading}
          empty={empty}
          filtered={isFiltered}
        />
      ) : (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={loading}
            rowHeight={ROW_HEIGHT}
            columnHeaderHeight={HEADER_HEIGHT}
            disableRowSelectionOnClick
            disableColumnMenu
            filterModel={{ items: [], quickFilterValues }}
            initialState={{ pagination: { paginationModel: { pageSize } } }}
            pageSizeOptions={[25, 50, 100]}
            slots={{
              loadingOverlay: () => <TableLoadingSkeleton rowHeight={ROW_HEIGHT} rows={10} />,
              noRowsOverlay: () => (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', p: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isFiltered
                      ? 'No records match the current search or filters.'
                      : 'No records to display.'}
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
            sx={buildGridSx(theme)}
          />
        </Box>
      )}
    </Box>
  );
};
