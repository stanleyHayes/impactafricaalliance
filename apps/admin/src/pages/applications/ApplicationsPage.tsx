import {
  calendarDateKey,
  isCalendarDateKey,
  REVIEWABLE_APPLICATION_STATUSES,
  toCalendarDateIso,
  type ApplicationCounts,
  type ApplicationListItem,
  type ReviewableApplicationStatus,
} from '@iaa/shared';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import { applicationStatusLabel } from '../../components/applications/ApplicationChips';
import {
  ApplicationList,
  ApplicationListSkeleton,
} from '../../components/applications/ApplicationList';
import {
  OutOfRangePage,
  ServerPagination,
  usePageParam,
} from '../../components/data/ServerPagination';
import { EmptyState } from '../../components/EmptyState';
import { DateField } from '../../components/fields/DateField';
import { OptionSelect, type SelectChoice } from '../../components/fields/OptionSelect';
import { PageHeader } from '../../components/PageHeader';
import {
  useApplicationCounts,
  useApplications,
  useExportApplications,
  type ApplicationCountsParams,
  type ApplicationListParams,
} from '../../lib/applications';
import { useForms } from '../../lib/forms';
import { pageGuides } from '../../lib/page-guides';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { VISUALLY_HIDDEN } from '../../lib/visually-hidden';

const PAGE_SIZE = 20;

const isStatus = (value: string | null): value is ReviewableApplicationStatus =>
  (REVIEWABLE_APPLICATION_STATUSES as readonly string[]).includes(value ?? '');

const OBJECT_ID = /^[a-f\d]{24}$/i;

// A hand-edited or truncated address would otherwise reach the API as a
// filter it refuses, and the whole list would turn into an error.
const dayParam = (value: string | null): string => (value && isCalendarDateKey(value) ? value : '');
const formParam = (value: string | null): string => (value && OBJECT_ID.test(value) ? value : '');

const total = (counts: ApplicationCounts | undefined): number | undefined =>
  counts ? Object.values(counts).reduce((sum, count) => sum + count, 0) : undefined;

const tabLabel = (label: string, count: number | undefined): string =>
  count === undefined ? label : `${label} (${count})`;

/** A calendar-day key from the address as the date field's stored value, and back. */
const toFieldValue = (key: string): string | null => {
  try {
    return key ? toCalendarDateIso(key) : null;
  } catch {
    return null;
  }
};
const toKey = (iso: string | null): string => (iso ? calendarDateKey(iso) : '');

/**
 * Forms to filter by. Everyone who reads forms gets the full list; a reviewer
 * who only reads applications gets the forms of the applications in view, so
 * the filter still works for them.
 */
const useFormChoices = (
  items: readonly ApplicationListItem[] | undefined,
  selectedId: string,
): SelectChoice[] => {
  const can = useCan();
  const canReadForms = can('read', 'forms');
  const forms = useForms({ page: 1, pageSize: 100, includeArchived: true }, canReadForms);
  const known = new Map<string, string>();
  for (const form of forms.data?.items ?? []) known.set(form.id, form.title);
  for (const item of items ?? []) known.set(item.form.id, item.form.title);
  if (selectedId && !known.has(selectedId)) known.set(selectedId, 'The selected form');
  return [
    { value: '', label: 'Every form', description: 'Applications to any form.' },
    ...[...known].map(([value, label]) => ({ value, label })),
  ];
};

/** "Export CSV": every application to the chosen form, as a spreadsheet. */
const ExportButton = ({ formId }: { formId: string }): JSX.Element => {
  const exporter = useExportApplications();
  return (
    <Stack spacing={0.5} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
      <Button
        variant="outlined"
        startIcon={<FileDownloadOutlinedIcon />}
        onClick={() => exporter.mutate(formId)}
        disabled={!formId || exporter.isPending}
      >
        {exporter.isPending ? 'Preparing…' : 'Export CSV'}
      </Button>
      <Typography variant="caption" color={exporter.isError ? 'error' : 'text.secondary'}>
        {exporter.isError
          ? exporter.error.message || 'The export could not be made.'
          : !formId && 'Choose a form to export its applications.'}
      </Typography>
    </Stack>
  );
};

const Results = ({
  query,
  filtered,
  status,
  onClearFilters,
}: {
  query: ReturnType<typeof useApplications>;
  filtered: boolean;
  status: string;
  onClearFilters: () => void;
}): JSX.Element => {
  if (query.isPending) return <ApplicationListSkeleton />;
  if (query.isError) {
    return (
      <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>
        {query.error.message || 'The applications could not be loaded.'}
      </Alert>
    );
  }
  // Past the last page: a status change can move the last one on it away.
  if (query.data.items.length === 0 && query.data.total > 0) {
    return <OutOfRangePage total={query.data.total} noun="application" compact={false} />;
  }
  if (query.data.items.length === 0) {
    return (
      <EmptyState
        icon={<InboxOutlinedIcon />}
        title={filtered ? 'No applications match' : 'No applications here yet'}
        description={
          filtered
            ? 'Try another form, search or date range, or clear the filters.'
            : `Applications people submit through your published forms appear here${status ? ` once they are ${status.toLowerCase()}` : ''}. Unfinished drafts never do.`
        }
        primaryAction={
          filtered
            ? { label: 'Clear filters', onClick: onClearFilters, icon: <FilterAltOffIcon /> }
            : undefined
        }
      />
    );
  }
  return <ApplicationList items={query.data.items} />;
};

interface Filters {
  status?: ReviewableApplicationStatus;
  formId: string;
  from: string;
  to: string;
  page: number;
  /** Change one filter in the address, going back to the first page. */
  setParam: (key: string, value: string) => void;
  /** Drop the form and date filters and the page, keeping the status tab. */
  clear: () => void;
}

/** The filters kept in the address, so a filtered list can be bookmarked and shared. */
const useAddressFilters = (): Filters => {
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status');
  const setParam = (key: string, value: string): void =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  const clear = (): void =>
    setParams((current) => {
      const next = new URLSearchParams();
      const status = current.get('status');
      if (status) next.set('status', status);
      return next;
    });
  return {
    ...(isStatus(rawStatus) ? { status: rawStatus } : {}),
    formId: formParam(params.get('formId')),
    from: dayParam(params.get('from')),
    to: dayParam(params.get('to')),
    page: usePageParam(),
    setParam,
    clear,
  };
};

const listParamsOf = (filters: Filters, q: string): ApplicationListParams => ({
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.formId ? { formId: filters.formId } : {}),
  ...(q ? { q } : {}),
  ...(filters.from ? { from: filters.from } : {}),
  ...(filters.to ? { to: filters.to } : {}),
  page: filters.page,
  pageSize: PAGE_SIZE,
});

/**
 * The list's form, search and date filters for the tab counts, or nothing when
 * there are none, so the tabs share the sidebar badge's request.
 */
const countParamsOf = (filters: Filters, q: string): ApplicationCountsParams | undefined => {
  const params: ApplicationCountsParams = {
    ...(filters.formId ? { formId: filters.formId } : {}),
    ...(q ? { q } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  };
  return Object.keys(params).length > 0 ? params : undefined;
};

/**
 * One tab per status, each with how many applications it holds among those
 * the other filters select, so a tab never disagrees with the list under it.
 */
const StatusTabs = ({ filters, q }: { filters: Filters; q: string }): JSX.Element => {
  const counts = useApplicationCounts(true, countParamsOf(filters, q));
  return (
    <Tabs
      value={filters.status ?? ''}
      onChange={(_event, value: string) => filters.setParam('status', value)}
      variant="scrollable"
      allowScrollButtonsMobile
      aria-label="Application status"
      sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
    >
      <Tab value="" label={tabLabel('All', total(counts.data))} />
      {REVIEWABLE_APPLICATION_STATUSES.map((value) => (
        <Tab
          key={value}
          value={value}
          label={tabLabel(applicationStatusLabel(value), counts.data?.[value])}
        />
      ))}
    </Tabs>
  );
};

const FilterBar = ({
  filters,
  formChoices,
  search,
  onSearch,
  onClear,
}: {
  filters: Filters;
  formChoices: SelectChoice[];
  search: string;
  onSearch: (text: string) => void;
  onClear: () => void;
}): JSX.Element => {
  const hasFilters = Boolean(filters.formId || search.trim() || filters.from || filters.to);
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        mb: 3,
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          lg: hasFilters ? '1.3fr 1.3fr 1fr 1fr auto' : '1.3fr 1.3fr 1fr 1fr',
        },
      }}
    >
      {/* Small fields, as on the Projects, Stories and Submissions toolbars. */}
      <OptionSelect
        size="small"
        label="Form"
        options={formChoices}
        value={filters.formId}
        onChange={(value) => filters.setParam('formId', value)}
        placeholder="Every form"
      />
      <TextField
        size="small"
        label="Search"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Name, email or reference"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          },
        }}
      />
      <DateField
        size="small"
        label="Submitted from"
        value={toFieldValue(filters.from)}
        onChange={(value) => filters.setParam('from', toKey(value))}
        maxDate={toFieldValue(filters.to)}
      />
      <DateField
        size="small"
        label="Submitted to"
        value={toFieldValue(filters.to)}
        onChange={(value) => filters.setParam('to', toKey(value))}
        minDate={toFieldValue(filters.from)}
      />
      {hasFilters && (
        <Chip
          label="Clear filters"
          onClick={onClear}
          onDelete={onClear}
          deleteIcon={<FilterAltOffIcon />}
          variant="outlined"
          sx={{
            borderRadius: 2,
            alignSelf: 'center',
            justifySelf: 'start',
            gridColumn: { sm: '1 / -1', lg: 'auto' },
          }}
        />
      )}
    </Box>
  );
};

/**
 * Every submitted application (plan §4.3): one tab per status with its count,
 * filtered by form, search and submission date, paged by the API, and
 * exported a form at a time.
 */
const ApplicationsPage = (): JSX.Element => {
  const filters = useAddressFilters();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const heading = useRef<HTMLHeadingElement>(null);
  const query = useApplications(listParamsOf(filters, q));
  const formChoices = useFormChoices(query.data?.items, filters.formId);
  const statusLabel = filters.status ? applicationStatusLabel(filters.status) : '';
  const clearFilters = (): void => {
    setSearch('');
    filters.clear();
  };

  return (
    <>
      <PageHeader
        title="Applications"
        description="What people have sent through the forms, by status. Unfinished drafts never appear here."
        icon={<AssignmentIndIcon />}
        help={pageGuides.applications}
        count={query.data?.total}
        action={<ExportButton formId={filters.formId} />}
      />
      <StatusTabs filters={filters} q={q} />
      <FilterBar
        filters={filters}
        formChoices={formChoices}
        search={search}
        onSearch={(text) => {
          setSearch(text);
          if (filters.page !== 1) filters.setParam('page', '');
        }}
        onClear={clearFilters}
      />
      <Typography ref={heading} tabIndex={-1} component="h2" sx={VISUALLY_HIDDEN}>
        {statusLabel || 'All'} applications
      </Typography>
      <Results
        query={query}
        filtered={Boolean(filters.formId || q || filters.from || filters.to)}
        status={statusLabel}
        onClearFilters={clearFilters}
      />
      <ServerPagination
        totalPages={query.data?.totalPages ?? 1}
        focusRef={heading}
        ariaLabel="Application pages"
      />
    </>
  );
};

export default ApplicationsPage;
