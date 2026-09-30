import { localDateKey, type DueBucket, type Task } from '@iaa/shared';
import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { useHasPermission } from '../../auth/useCan';
import { EmptyState } from '../../components/EmptyState';
import { PageHeader } from '../../components/PageHeader';
import {
  QuickCreateTaskDialog,
  TaskCreatedSnackbar,
} from '../../components/tasks/QuickCreateTaskDialog';
import { TaskDrawerHost } from '../../components/tasks/TaskDrawer';
import { TaskRow, TaskRowsSkeleton } from '../../components/tasks/TaskRow';
import { TaskViewTabs } from '../../components/tasks/TaskViewTabs';
import { useTaskDrawer } from '../../components/tasks/use-task-drawer';
import { pageGuides } from '../../lib/page-guides';
import { useTasks, type TaskListParams } from '../../lib/tasks';
import { surfaceSx } from '../../theme/surfaces';

/** Tasks shown in each section before "See all". */
const SECTION_SIZE = 20;

interface SectionSpec {
  key: DueBucket | 'completed';
  title: string;
  /** What an empty section says. Plain, and a little pleased for you. */
  empty: string;
  params: TaskListParams;
  /** The same tasks on All tasks, for "See all". */
  allLink: string;
}

const sectionsFor = (today: string): SectionSpec[] => [
  {
    key: 'overdue',
    title: 'Overdue',
    empty: 'Nothing overdue. Nicely done.',
    params: { due: 'overdue', today, sort: 'due', order: 'asc' },
    allLink: '/tasks/all?assignee=me&due=overdue',
  },
  {
    key: 'today',
    title: 'Due today',
    empty: 'Nothing due today.',
    params: { due: 'today', today, sort: 'priority', order: 'desc' },
    allLink: '/tasks/all?assignee=me&due=today',
  },
  {
    key: 'upcoming',
    title: 'Upcoming',
    empty: 'Nothing scheduled for later yet.',
    params: { due: 'upcoming', today, sort: 'due', order: 'asc' },
    allLink: '/tasks/all?assignee=me&due=upcoming',
  },
  {
    key: 'none',
    title: 'No due date',
    empty: 'Every task of yours has a date.',
    params: { due: 'none', today, sort: 'priority', order: 'desc' },
    allLink: '/tasks/all?assignee=me&due=none',
  },
];

const COMPLETED: SectionSpec = {
  key: 'completed',
  title: 'Completed',
  empty: 'Nothing finished yet. It will show here when you are.',
  params: { status: ['done'], sort: 'updated', order: 'desc' },
  allLink: '/tasks/all?assignee=me&status=done',
};

/** One group of your tasks, fetched on its own so each shows as soon as it arrives. */
const TaskSection = ({
  spec,
  onOpen,
  onLoaded,
}: {
  spec: SectionSpec;
  onOpen: (key: string) => void;
  onLoaded: (key: string, total: number) => void;
}): JSX.Element => {
  const query = useTasks({ ...spec.params, assigneeId: 'me', pageSize: SECTION_SIZE });
  const headingId = `my-tasks-${spec.key}`;
  const total = query.data?.total;
  useEffect(() => {
    if (total !== undefined) onLoaded(spec.key, total);
  }, [onLoaded, spec.key, total]);

  const renderBody = (): JSX.Element => {
    if (query.isPending) return <TaskRowsSkeleton rows={2} />;
    if (query.isError) {
      return (
        <Alert
          severity="error"
          sx={{ m: 1.5 }}
          action={
            <Button color="inherit" size="small" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        >
          {spec.title} could not be loaded.
        </Alert>
      );
    }
    if (query.data.items.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
          {spec.empty}
        </Typography>
      );
    }
    return (
      <Box component="ul" sx={{ m: 0, p: 0.5 }}>
        {query.data.items.map((task) => (
          <TaskRow key={task.id} task={task} onOpen={onOpen} />
        ))}
      </Box>
    );
  };

  return (
    <Box
      component="section"
      aria-labelledby={headingId}
      sx={{
        borderRadius: 3,
        // The skin's card (paper with a divider edge in Classic). A late group
        // keeps its warning edge in every skin: that colour means something.
        ...surfaceSx.card,
        ...(spec.key === 'overdue' && total ? { borderColor: 'error.light' } : {}),
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography id={headingId} component="h2" variant="h6" sx={{ fontSize: '1.05rem' }}>
          {spec.title}
        </Typography>
        {total !== undefined && (
          <Chip
            size="small"
            label={total}
            color={spec.key === 'overdue' && total > 0 ? 'error' : 'default'}
            aria-label={`${total} ${total === 1 ? 'task' : 'tasks'}`}
            sx={{ fontWeight: 700 }}
          />
        )}
        <Box sx={{ flexGrow: 1 }} />
        {total !== undefined && total > SECTION_SIZE && (
          <Link component={RouterLink} to={spec.allLink} variant="body2">
            See all {total}
          </Link>
        )}
      </Stack>
      {renderBody()}
    </Box>
  );
};

/**
 * Work assigned to you, grouped by when it is due: Overdue, Due today,
 * Upcoming and No due date, compared with the calendar on this device.
 *
 * Finished work leaves these groups; "Show completed" adds a group of what
 * you have finished, most recent first.
 */
const MyTasksPage = (): JSX.Element => {
  const { user } = useAuth();
  const canCreate = useHasPermission('create', 'tasks');
  const { open } = useTaskDrawer();
  const [params, setParams] = useSearchParams();
  const showCompleted = params.get('completed') === '1';
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<Task | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  // Worked out once per visit: a list that moved its groups at midnight while
  // being read would be more confusing than one a day behind until refresh.
  const [today] = useState(localDateKey);
  const sections = sectionsFor(today);

  const navigate = useNavigate();
  const recordTotal = useCallback(
    (key: string, total: number): void =>
      setTotals((current) => (current[key] === total ? current : { ...current, [key]: total })),
    [],
  );
  const openCount = sections.reduce((sum, spec) => sum + (totals[spec.key] ?? 0), 0);
  const allLoaded = sections.every((spec) => totals[spec.key] !== undefined);
  const allClear = allLoaded && openCount === 0;

  const setShowCompleted = (show: boolean): void =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (show) next.set('completed', '1');
        else next.delete('completed');
        return next;
      },
      { replace: true },
    );

  return (
    <>
      <PageHeader
        title="My tasks"
        description="Work assigned to you, grouped by when it is due."
        icon={<TaskAltIcon />}
        count={allLoaded ? openCount : undefined}
        help={pageGuides['my-tasks']}
        action={
          canCreate && (
            <Button
              variant="contained"
              startIcon={<AddTaskRoundedIcon />}
              onClick={() => setCreating(true)}
              fullWidth
            >
              New task
            </Button>
          )
        }
      />
      <TaskViewTabs />
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2, mt: -1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showCompleted}
              onChange={(_event, checked) => setShowCompleted(checked)}
            />
          }
          label="Show completed"
        />
      </Stack>
      {allClear && (
        <EmptyState
          compact
          icon={<CelebrationOutlinedIcon />}
          title="Your list is clear"
          description="Nothing is assigned to you right now. Tasks your colleagues give you, and ones you give yourself, will appear here."
          primaryAction={
            canCreate
              ? {
                  label: 'New task',
                  icon: <AddTaskRoundedIcon />,
                  onClick: () => setCreating(true),
                }
              : undefined
          }
          secondaryAction={{
            label: 'See all tasks',
            variant: 'text',
            onClick: () => navigate('/tasks/all'),
          }}
        />
      )}
      <Stack spacing={2.5}>
        {/* Kept mounted but hidden when all are empty, so their counts stay current. */}
        {sections.map((spec) => (
          <Box key={spec.key} sx={{ display: allClear ? 'none' : 'block' }}>
            <TaskSection spec={spec} onOpen={open} onLoaded={recordTotal} />
          </Box>
        ))}
        {showCompleted && <TaskSection spec={COMPLETED} onOpen={open} onLoaded={recordTotal} />}
      </Stack>
      <QuickCreateTaskDialog
        open={creating}
        onClose={() => setCreating(false)}
        defaults={{ assigneeIds: user ? [user.id] : [] }}
        onCreated={(task) => {
          setCreating(false);
          setCreated(task);
        }}
      />
      <TaskCreatedSnackbar task={created} onOpen={open} onClose={() => setCreated(null)} />
      <TaskDrawerHost />
    </>
  );
};

export default MyTasksPage;
