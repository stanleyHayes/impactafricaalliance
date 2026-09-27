import type { SortOrder, TaskListItem, TaskSort } from '@iaa/shared';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';
import {
  OutOfRangePage,
  ServerPagination,
  usePageParam,
} from '../../components/data/ServerPagination';
import { TableLoadingSkeleton } from '../../components/data/TableLoadingSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { OptionSelect, type SelectChoice } from '../../components/fields/OptionSelect';
import { PageHeader } from '../../components/PageHeader';
import { PersonAvatars } from '../../components/tasks/PersonAvatars';
import { TaskDrawerHost } from '../../components/tasks/TaskDrawer';
import { TaskDueChip } from '../../components/tasks/TaskDueChip';
import { TaskFilters } from '../../components/tasks/TaskFilters';
import { TaskPriorityChip } from '../../components/tasks/TaskPriorityChip';
import { ChecklistCount, TaskRow, TaskRowsSkeleton } from '../../components/tasks/TaskRow';
import { TaskStatusChip } from '../../components/tasks/TaskStatusChip';
import { TaskViewTabs } from '../../components/tasks/TaskViewTabs';
import { useTaskDrawer } from '../../components/tasks/use-task-drawer';
import { useTaskFilters, useTaskSort } from '../../components/tasks/use-task-filters';
import { pageGuides } from '../../lib/page-guides';
import { useTasks } from '../../lib/tasks';

/** Rows per page: a screenful on a laptop, and a short scroll on a phone. */
const PAGE_SIZE = 25;

const updatedAt = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * The sorts on offer where the table's headings are not shown (phones and
 * tablets), each with the direction a person would mean by it.
 */
const SORT_CHOICES: SelectChoice[] = [
  { value: 'updated:desc', label: 'Recently updated', description: 'Latest activity first.' },
  { value: 'due:asc', label: 'Due soonest', description: 'Undated work comes last.' },
  { value: 'due:desc', label: 'Due latest', description: 'Undated work comes last.' },
  { value: 'priority:desc', label: 'Most urgent first', description: 'Urgent, then high.' },
  { value: 'priority:asc', label: 'Least urgent first', description: 'Low, then medium.' },
  { value: 'created:desc', label: 'Newest first', description: 'Most recently created.' },
  { value: 'created:asc', label: 'Oldest first', description: 'Longest-standing work.' },
  { value: 'key:asc', label: 'Key, lowest first', description: 'IAA-1, IAA-2, IAA-3…' },
  { value: 'key:desc', label: 'Key, highest first', description: 'Newest keys first.' },
];

/** "Sort by" for the stacked list, which has no column headings to click. */
const SortMenu = (): JSX.Element => {
  const { sort, order, setSortOrder } = useTaskSort();
  const value = `${sort}:${order}`;
  const known = SORT_CHOICES.some((choice) => choice.value === value);
  return (
    <OptionSelect
      label="Sort by"
      size="small"
      options={SORT_CHOICES}
      value={known ? value : 'updated:desc'}
      onChange={(next) => {
        const [nextSort, nextOrder] = next.split(':') as [TaskSort, SortOrder];
        setSortOrder(nextSort, nextOrder);
      }}
      sx={{ minWidth: { xs: '100%', sm: 240 } }}
    />
  );
};

interface SortableHeading {
  sort: TaskSort;
  label: string;
}

const SortHeading = ({
  heading,
  sort,
  order,
  onSort,
}: {
  heading: SortableHeading;
  sort: TaskSort;
  order: 'asc' | 'desc';
  onSort: (sort: TaskSort) => void;
}): JSX.Element => (
  <TableCell sortDirection={sort === heading.sort ? order : false}>
    <TableSortLabel
      active={sort === heading.sort}
      direction={sort === heading.sort ? order : 'asc'}
      onClick={() => onSort(heading.sort)}
    >
      {heading.label}
    </TableSortLabel>
  </TableCell>
);

/** The list as a table on wider screens: a row per task, the key and title opening it. */
const TaskTable = ({
  items,
  onOpen,
}: {
  items: TaskListItem[];
  onOpen: (key: string) => void;
}): JSX.Element => {
  const { sort, order, setSort } = useTaskSort();
  const heading = (sortKey: TaskSort, label: string): JSX.Element => (
    <SortHeading heading={{ sort: sortKey, label }} sort={sort} order={order} onSort={setSort} />
  );
  return (
    <Table size="small" aria-label="Tasks">
      <TableHead>
        <TableRow>
          {heading('key', 'Task')}
          <TableCell>Status</TableCell>
          {heading('priority', 'Priority')}
          <TableCell>Assignees</TableCell>
          {heading('due', 'Due')}
          {heading('updated', 'Updated')}
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((task) => (
          <TableRow
            key={task.id}
            hover
            onClick={() => onOpen(task.key)}
            // Finished rows are not faded: their small text would fall below AA
            // contrast. The Done chip and the struck-through title say it.
            sx={{ cursor: 'pointer', '& td': { py: 1.25 } }}
          >
            <TableCell sx={{ maxWidth: 420 }}>
              <Link
                component="button"
                type="button"
                underline="hover"
                onClick={(event) => {
                  // The row opens it too; one open is enough.
                  event.stopPropagation();
                  onOpen(task.key);
                }}
                sx={{ textAlign: 'left', color: 'text.primary', display: 'block', width: '100%' }}
              >
                <Typography component="span" variant="caption" sx={{ fontWeight: 750, mr: 1 }}>
                  {task.key}
                </Typography>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: 650,
                    ...(task.status === 'done' && {
                      color: 'text.secondary',
                      textDecoration: 'line-through',
                    }),
                  }}
                >
                  {task.title}
                </Typography>
              </Link>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 0.5 }}>
                {task.project && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {task.project.title}
                  </Typography>
                )}
                <ChecklistCount task={task} />
              </Stack>
            </TableCell>
            <TableCell>
              <TaskStatusChip status={task.status} />
            </TableCell>
            <TableCell>
              <TaskPriorityChip priority={task.priority} />
            </TableCell>
            <TableCell>
              <PersonAvatars people={task.assignees} />
            </TableCell>
            <TableCell>
              <TaskDueChip dueDate={task.dueDate} status={task.status} />
            </TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
              {updatedAt(task.updatedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * Every task across the team, filtered, sorted and paged by the API so the
 * browser never loads the whole list. Filters, sort and page live in the
 * address; a row opens the task in the drawer beside the list.
 */
const AllTasksPage = (): JSX.Element => {
  const theme = useTheme();
  // The table needs the room a laptop gives it beside the sidebar; below that,
  // rows stack their details so nothing scrolls sideways.
  const wide = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const canCreate = useHasPermission('create', 'tasks');
  const controls = useTaskFilters();
  const { sort, order } = useTaskSort();
  const page = usePageParam();
  const { open } = useTaskDrawer();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const query = useTasks({ ...controls.params, sort, order, page, pageSize: PAGE_SIZE });
  // A list narrowed to one project starts new work on that project.
  const { project } = controls.filters;
  const newTaskPath =
    project && project !== 'none' ? `/tasks/new?projectId=${project}` : '/tasks/new';

  const renderList = (): JSX.Element => {
    if (query.isPending) {
      return wide ? <TableLoadingSkeleton rows={8} columns={6} /> : <TaskRowsSkeleton rows={6} />;
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
          {query.error.message || 'The tasks could not be loaded.'}
        </Alert>
      );
    }
    // Past the last page (an old link, or the last task on it finished).
    if (query.data.items.length === 0 && query.data.total > 0) {
      return <OutOfRangePage total={query.data.total} noun="task" />;
    }
    if (query.data.items.length === 0) {
      return controls.activeCount > 0 ? (
        <EmptyState
          compact
          icon={<SearchOffRoundedIcon />}
          title="No tasks match these filters"
          description="Try a broader search, or clear the filters to see every open task."
          primaryAction={{ label: 'Clear filters', onClick: controls.clear, variant: 'outlined' }}
        />
      ) : (
        <EmptyState
          compact
          icon={<FormatListBulletedIcon />}
          title="No open tasks"
          description="Tasks the team creates, on a project or on their own, will be listed here."
          primaryAction={
            canCreate
              ? {
                  label: 'New task',
                  icon: <AddTaskRoundedIcon />,
                  onClick: () => navigate(newTaskPath),
                }
              : undefined
          }
        />
      );
    }
    return wide ? (
      <Box sx={{ overflowX: 'auto' }}>
        <TaskTable items={query.data.items} onOpen={open} />
      </Box>
    ) : (
      <Box component="ul" sx={{ m: 0, p: 0.5 }}>
        {query.data.items.map((task) => (
          <TaskRow key={task.id} task={task} onOpen={open} />
        ))}
      </Box>
    );
  };

  return (
    <>
      <PageHeader
        title="All tasks"
        description="Every task across the team, with filters for status, people, projects and dates."
        icon={<FormatListBulletedIcon />}
        count={query.data?.total}
        help={pageGuides['all-tasks']}
        action={
          canCreate && (
            <Button
              component={RouterLink}
              to={newTaskPath}
              variant="contained"
              startIcon={<AddTaskRoundedIcon />}
              fullWidth
            >
              New task
            </Button>
          )
        }
      />
      <TaskViewTabs />
      <TaskFilters controls={controls} />
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          opacity: query.isPlaceholderData ? 0.7 : 1,
          transition: 'opacity 150ms ease',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: (current) => alpha(current.palette.primary.main, 0.03),
          }}
        >
          <Typography
            ref={headingRef}
            tabIndex={-1}
            component="h2"
            variant="subtitle2"
            sx={{ color: 'text.secondary', outline: 'none', flexGrow: 1 }}
          >
            {query.data
              ? `${query.data.total} ${query.data.total === 1 ? 'task' : 'tasks'}${
                  query.data.totalPages > 1
                    ? ` · page ${query.data.page} of ${query.data.totalPages}`
                    : ''
                }`
              : 'Tasks'}
          </Typography>
          {!wide && <SortMenu />}
        </Stack>
        {renderList()}
      </Box>
      <ServerPagination
        totalPages={query.data?.totalPages ?? 1}
        focusRef={headingRef}
        ariaLabel="Task pages"
      />
      <TaskDrawerHost />
    </>
  );
};

export default AllTasksPage;
