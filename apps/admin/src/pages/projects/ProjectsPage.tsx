import {
  PROGRAMME_KEYS,
  PROJECT_SORTS,
  PROJECT_STATUSES,
  WORK_PRIORITIES,
  type ProjectSort,
  type ProjectStatus,
  type WorkPriority,
} from '@iaa/shared';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import FirstPageRoundedIcon from '@mui/icons-material/FirstPageRounded';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import { ServerPagination, usePageParam } from '../../components/data/ServerPagination';
import { useViewMode } from '../../components/data/useViewMode';
import { ViewToggle } from '../../components/data/ViewToggle';
import { EmptyState, type EmptyStateAction } from '../../components/EmptyState';
import { OptionSelect, type SelectChoice } from '../../components/fields/OptionSelect';
import { PageHeader } from '../../components/PageHeader';
import { countLabel } from '../../components/projects/project-format';
import {
  ProjectCardGrid,
  ProjectCardSkeleton,
  ProjectTable,
  ProjectTableSkeleton,
} from '../../components/projects/ProjectList';
import { pageGuides } from '../../lib/page-guides';
import { PROJECT_VIEWS, useProjects, type ProjectView } from '../../lib/projects';
import {
  PROGRAMME_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  WORK_PRIORITY_OPTIONS,
  withAnyOption,
} from '../../lib/select-options';
import { useDebouncedValue } from '../../lib/use-debounced-value';

const VIEW_LABELS: Record<ProjectView, string> = {
  all: 'All projects',
  mine: 'My projects',
  archived: 'Archived',
};

/**
 * The "any" row of a filter. A real value rather than '', because a select
 * showing an empty value keeps its label inside the field, on top of the
 * "Any…" text; the address still holds nothing for it.
 */
const ANY = 'any';

const anyOf = (options: SelectChoice[], label: string, description: string): SelectChoice[] =>
  withAnyOption(options, label, description).map((option) =>
    option.value === '' ? { ...option, value: ANY } : option,
  );

/** The address value for a filter choice: nothing for "any". */
const filterValue = (value: string): string => (value === ANY ? '' : value);

// The archived tab has its own status, so the status filter leaves it out.
const STATUS_FILTER = anyOf(
  PROJECT_STATUS_OPTIONS.filter((option) => option.value !== 'archived'),
  'Any status',
  'Every project that is not archived.',
);
const PRIORITY_FILTER = anyOf(WORK_PRIORITY_OPTIONS, 'Any priority', 'Every priority.');
const PROGRAMME_FILTER = anyOf(PROGRAMME_OPTIONS, 'Any programme', 'Every programme area.');

const SORT_OPTIONS: SelectChoice[] = [
  { value: 'updated', label: 'Recently updated', description: 'The latest changes first.' },
  { value: 'start', label: 'Starting soonest', description: 'By start date; undated last.' },
  { value: 'end', label: 'Ending soonest', description: 'By end date; undated last.' },
  { value: 'title', label: 'Title A to Z', description: 'Alphabetical by title.' },
];

const oneOf = <T extends string>(list: readonly T[], value: string | null): T | '' =>
  list.includes(value as T) ? (value as T) : '';

/** What each tab says when it has nothing to show, before any filter is applied. */
const EMPTY_COPY: Record<ProjectView, { icon: JSX.Element; title: string; description: string }> = {
  all: {
    icon: <AccountTreeIcon />,
    title: 'No projects yet',
    description:
      'Projects the team sets up appear here, with who leads them, when they run and how far along they are.',
  },
  mine: {
    icon: <PersonSearchOutlinedIcon />,
    title: 'You are not on any projects yet',
    description:
      // Said the same way to everyone; the New project button appears only for people who may create one.
      'Projects you lead or are a member of appear here. Ask a project lead to add you.',
  },
  archived: {
    icon: <ArchiveOutlinedIcon />,
    title: 'Nothing archived',
    description:
      'Archived projects appear here. They keep their tasks and stories, and you can restore them at any time.',
  },
};

/**
 * The search box and the `q` in the address, kept in step both ways. Typed
 * text reaches the address once typing pauses; an address that changes by
 * other means (Back, Clear filters) puts its text back in the box.
 *
 * The write runs only when the settled text itself changes. `setParams`
 * changes identity with every address change, so an effect keyed on it
 * alone would write the old text straight back after Clear filters or Back.
 */
const useSearchText = (
  q: string,
  setParams: ReturnType<typeof useSearchParams>[1],
): [string, (text: string) => void] => {
  const [search, setSearch] = useState(q);
  const settledSearch = useDebouncedValue(search.trim(), 350);
  const previousSettled = useRef(settledSearch);
  const lastWritten = useRef(q);

  useEffect(() => {
    if (settledSearch === previousSettled.current) return;
    previousSettled.current = settledSearch;
    lastWritten.current = settledSearch;
    setParams(
      (current) => {
        if ((current.get('q') ?? '') === settledSearch) return current;
        const next = new URLSearchParams(current);
        if (settledSearch) next.set('q', settledSearch);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [settledSearch, setParams]);

  useEffect(() => {
    if (q === lastWritten.current) return;
    lastWritten.current = q;
    setSearch(q);
  }, [q]);

  return [search, setSearch];
};

/**
 * The list's choices, read from and written to the address. Every change
 * but paging goes back to page 1, and the search box writes its text only
 * once typing pauses.
 */
const useProjectListState = () => {
  const [params, setParams] = useSearchParams();
  const view = oneOf(PROJECT_VIEWS, params.get('view')) || 'all';
  const status = oneOf(PROJECT_STATUSES, params.get('status')) as ProjectStatus | '';
  const priority = oneOf(WORK_PRIORITIES, params.get('priority')) as WorkPriority | '';
  // A programme the site no longer has would make the API refuse the whole
  // list, so an unknown one in an old bookmark is ignored instead.
  const programme = oneOf(PROGRAMME_KEYS, params.get('programme'));
  const sort = (oneOf(PROJECT_SORTS, params.get('sort')) || 'updated') as ProjectSort;
  const q = params.get('q') ?? '';
  const page = usePageParam();
  const [search, setSearch] = useSearchText(q, setParams);

  /** Sets (or, for an empty value, removes) one parameter and goes back to page 1. */
  const setParam = (key: string, value: string): void => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  };

  const clearFilters = (): void => {
    setSearch('');
    setParams((current) => {
      const next = new URLSearchParams();
      const keep = current.get('view');
      if (keep) next.set('view', keep);
      return next;
    });
  };

  // The archived tab has its own status; a status filter left in the address does not apply there.
  const statusFilter = view === 'archived' ? '' : status;
  return {
    list: { view, q, status: statusFilter, priority, programme, sort, page },
    filtered: Boolean(q || statusFilter || priority || programme),
    search,
    setSearch,
    setParam,
    setView: (next: ProjectView) => setParam('view', next === 'all' ? '' : next),
    clearFilters,
    firstPage: () => setParam('page', ''),
  };
};

interface ProjectResultsProps {
  query: ReturnType<typeof useProjects>;
  view: ProjectView;
  showCards: boolean;
  filtered: boolean;
  onClearFilters: () => void;
  onFirstPage: () => void;
  createAction?: EmptyStateAction;
}

/** The list itself: its skeleton, its error, the right empty state, or the projects. */
const ProjectResults = ({
  query,
  view,
  showCards,
  filtered,
  onClearFilters,
  onFirstPage,
  createAction,
}: ProjectResultsProps): JSX.Element => {
  if (query.isPending) {
    return showCards ? <ProjectCardSkeleton /> : <ProjectTableSkeleton />;
  }
  if (query.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void query.refetch()}>
            Retry
          </Button>
        }
      >
        {query.error.message || 'The projects could not be loaded.'}
      </Alert>
    );
  }
  // An old link or a deletion can leave the address past the last page.
  if (query.data.items.length === 0 && query.data.total > 0) {
    return (
      <EmptyState
        compact
        icon={<FirstPageRoundedIcon />}
        title="Nothing on this page"
        description={`There are ${countLabel(query.data.total, 'project')} in this view, on earlier pages.`}
        primaryAction={{ label: 'Go to the first page', onClick: onFirstPage, variant: 'outlined' }}
      />
    );
  }
  if (query.data.items.length === 0 && filtered) {
    return (
      <EmptyState
        compact
        icon={<FilterAltOffOutlinedIcon />}
        title="No projects match"
        description="Nothing in this view matches your search and filters. Try other words, or clear the filters."
        primaryAction={{ label: 'Clear filters', onClick: onClearFilters, variant: 'outlined' }}
      />
    );
  }
  if (query.data.items.length === 0) {
    return (
      <EmptyState
        {...EMPTY_COPY[view]}
        primaryAction={view === 'archived' ? undefined : createAction}
      />
    );
  }
  return showCards ? (
    <ProjectCardGrid items={query.data.items} />
  ) : (
    <ProjectTable items={query.data.items} />
  );
};

/**
 * Projects: All, My projects and Archived as tabs, with search and filters,
 * a table or card view, and paging done by the API. Every choice lives in
 * the address, so a filtered view can be bookmarked or shared.
 */
const ProjectsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const can = useCan();
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('sm'));
  const [mode, setMode] = useViewMode('projects');
  const resultsRef = useRef<HTMLHeadingElement | null>(null);
  const state = useProjectListState();
  const { view, status, priority, programme, sort } = state.list;
  const query = useProjects(state.list);

  const canCreate = can('create', 'projects');
  const createAction: EmptyStateAction | undefined = canCreate
    ? { label: 'New project', icon: <AddRoundedIcon />, onClick: () => navigate('/projects/new') }
    : undefined;

  return (
    <>
      <PageHeader
        title="Projects"
        description="Initiatives the team is delivering: who leads them, when they run, and how far along they are."
        icon={<AccountTreeIcon />}
        help={pageGuides['projects']}
        count={query.data?.total}
        action={
          canCreate ? (
            <Button
              component={RouterLink}
              to="/projects/new"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              fullWidth
            >
              New project
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={view}
        onChange={(_event, next: ProjectView) => state.setView(next)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Which projects to show"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {PROJECT_VIEWS.map((key) => (
          <Tab key={key} value={key} label={VIEW_LABELS[key]} />
        ))}
      </Tabs>

      <Box
        role="search"
        aria-label="Filter projects"
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'minmax(0, 2fr) repeat(4, minmax(0, 1fr)) auto',
          },
          gap: 1.5,
          alignItems: 'center',
          mb: 2.5,
        }}
      >
        <TextField
          size="small"
          label="Search"
          placeholder="Title, code or summary"
          value={state.search}
          onChange={(event) => state.setSearch(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {view !== 'archived' && (
          <OptionSelect
            size="small"
            label="Status"
            options={STATUS_FILTER}
            value={status || ANY}
            onChange={(value) => state.setParam('status', filterValue(value))}
          />
        )}
        <OptionSelect
          size="small"
          label="Priority"
          options={PRIORITY_FILTER}
          value={priority || ANY}
          onChange={(value) => state.setParam('priority', filterValue(value))}
        />
        <OptionSelect
          size="small"
          label="Programme"
          options={PROGRAMME_FILTER}
          value={programme || ANY}
          onChange={(value) => state.setParam('programme', filterValue(value))}
        />
        <OptionSelect
          size="small"
          label="Sort by"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(value) => state.setParam('sort', value === 'updated' ? '' : value)}
        />
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'flex-end' }}>
          <ViewToggle value={mode} onChange={setMode} />
        </Box>
      </Box>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={2}
        sx={{ mb: 1.5, minHeight: 32 }}
      >
        <Typography
          ref={resultsRef}
          tabIndex={-1}
          component="h2"
          variant="subtitle2"
          color="text.secondary"
          sx={{ outline: 'none' }}
          aria-live="polite"
        >
          {query.data ? countLabel(query.data.total, 'project') : 'Loading projects…'}
        </Typography>
        {state.filtered && (
          <Button
            size="small"
            startIcon={<FilterAltOffOutlinedIcon />}
            onClick={state.clearFilters}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      <ProjectResults
        query={query}
        view={view}
        // A phone has no room for a table; the cards carry the same facts.
        showCards={narrow || mode === 'grid'}
        filtered={state.filtered}
        onClearFilters={state.clearFilters}
        onFirstPage={state.firstPage}
        createAction={createAction}
      />

      {query.data && (
        <ServerPagination
          totalPages={query.data.totalPages}
          focusRef={resultsRef}
          ariaLabel="Project pages"
        />
      )}
    </>
  );
};

export default ProjectsPage;
