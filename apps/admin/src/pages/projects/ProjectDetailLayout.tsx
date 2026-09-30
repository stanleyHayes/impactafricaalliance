import type { Project } from '@iaa/shared';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, Outlet, useParams } from 'react-router-dom';

import { useHasPermission } from '../../auth/useCan';
import { DetailTabs, type DetailTab } from '../../components/detail/DetailTabs';
import { InformationItem } from '../../components/InformationItem';
import { PageHeader } from '../../components/PageHeader';
import { formatDateRange, programmeLabel } from '../../components/projects/project-format';
import { ProjectActions } from '../../components/projects/ProjectActions';
import { ProjectPriorityChip, ProjectStatusChip } from '../../components/projects/ProjectChips';
import { ProjectProgressBar } from '../../components/projects/ProjectProgressBar';
import type { ProjectOutletContext } from '../../components/projects/useProjectOutlet';
import { ApiError } from '../../lib/api-client';
import { pageGuides } from '../../lib/page-guides';
import { useProject } from '../../lib/projects';
import { backLinkSx } from '../../theme/surfaces';

/**
 * The project's sections, one route each under `/projects/:projectId`.
 * Relative, so they resolve against whichever project is open.
 */
const PROJECT_TABS: readonly DetailTab[] = [
  { to: '.', label: 'Overview', icon: <DashboardOutlinedIcon />, end: true },
  { to: 'tasks', label: 'Tasks', icon: <AssignmentTurnedInOutlinedIcon /> },
  { to: 'milestones', label: 'Milestones & activities', icon: <FlagOutlinedIcon /> },
  { to: 'media', label: 'Media & evidence', icon: <PhotoLibraryOutlinedIcon /> },
  { to: 'impact', label: 'Impact', icon: <AutoStoriesOutlinedIcon /> },
  { to: 'documents', label: 'Documents', icon: <FolderOutlinedIcon /> },
  { to: 'activity', label: 'Activity', icon: <HistoryRoundedIcon /> },
];

const DESCRIPTION = 'Plans, people, progress and evidence for one initiative.';

const BackLink = (): JSX.Element => (
  <Button
    component={RouterLink}
    to="/projects"
    startIcon={<ArrowBackRoundedIcon />}
    sx={backLinkSx}
  >
    All projects
  </Button>
);

const CARD_SX = { borderRadius: 3, p: { xs: 2.5, md: 3 }, mb: 3 } as const;

const FACTS_GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
} as const;

/** Status, priority, progress and the facts people look for first, with the actions. */
const ProjectHeaderCard = ({ project }: { project: Project }): JSX.Element => (
  <Card variant="outlined" sx={CARD_SX} component="section" aria-label="Project at a glance">
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
        <ProjectStatusChip status={project.status} size="medium" />
        <ProjectPriorityChip priority={project.priority} size="medium" />
        {project.code && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
            {project.code}
          </Typography>
        )}
      </Stack>
      <Box sx={{ maxWidth: 560 }}>
        <Typography variant="subtitle2" component="h2" sx={{ mb: 1 }}>
          Progress
        </Typography>
        <ProjectProgressBar progress={project.progress} />
      </Box>
      <Box sx={FACTS_GRID}>
        <InformationItem label="Lead" icon={<PersonOutlineRoundedIcon />}>
          {project.lead?.name ?? 'No lead yet'}
        </InformationItem>
        <InformationItem label="Dates" icon={<CalendarMonthOutlinedIcon />}>
          {formatDateRange(project.startDate, project.endDate)}
        </InformationItem>
        <InformationItem label="Programme" icon={<CategoryOutlinedIcon />}>
          {programmeLabel(project.programme) || 'Not tied to a programme'}
        </InformationItem>
      </Box>
      <ProjectActions project={project} />
    </Stack>
  </Card>
);

/** The shape of the header card and tab content while the project loads. */
const ProjectLayoutSkeleton = (): JSX.Element => (
  <Box aria-hidden>
    <Card variant="outlined" sx={CARD_SX}>
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={96} height={32} sx={{ borderRadius: 99 }} />
          <Skeleton variant="rounded" width={130} height={32} sx={{ borderRadius: 99 }} />
        </Stack>
        <Box sx={{ maxWidth: 560 }}>
          <Skeleton variant="text" width={80} />
          <Skeleton variant="rounded" height={8} sx={{ borderRadius: 99 }} />
          <Skeleton variant="text" width={160} sx={{ fontSize: '0.75rem' }} />
        </Box>
        <Box sx={FACTS_GRID}>
          {[0, 1, 2].map((key) => (
            <Stack key={key} direction="row" spacing={1.5}>
              <Skeleton variant="rounded" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width={60} sx={{ fontSize: '0.75rem' }} />
                <Skeleton variant="text" width="70%" />
              </Box>
            </Stack>
          ))}
        </Box>
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={88} height={36} />
          <Skeleton variant="rounded" width={140} height={36} />
        </Stack>
      </Stack>
    </Card>
    <Skeleton variant="rounded" height={54} sx={{ borderRadius: 3, mb: 3 }} />
    <Skeleton variant="rounded" height={260} sx={{ borderRadius: 3 }} />
  </Box>
);

/**
 * The frame around every project tab: header, the project at a glance with
 * its actions, section tabs, and the tab's own content through `<Outlet />`.
 * The project is loaded once here and handed to the tabs, which read it with
 * `useProjectOutlet()`.
 */
const ProjectDetailLayout = (): JSX.Element => {
  const { projectId } = useParams();
  const query = useProject(projectId);
  const canReadTasks = useHasPermission('read', 'tasks');

  if (query.isPending) {
    return (
      <>
        <PageHeader
          title="Project"
          description={DESCRIPTION}
          icon={<AccountTreeIcon />}
          help={pageGuides['project-detail']}
          action={<BackLink />}
        />
        <ProjectLayoutSkeleton />
      </>
    );
  }

  // A failed refresh of a project already on screen keeps it there, with a
  // note (below); only a project that never loaded is replaced by the error.
  if (!query.data) {
    const missing = query.error instanceof ApiError && [400, 404].includes(query.error.status);
    return (
      <>
        <PageHeader title="Project" description={DESCRIPTION} icon={<AccountTreeIcon />} />
        <Alert
          severity={missing ? 'warning' : 'error'}
          action={
            missing ? undefined : (
              <Button color="inherit" size="small" onClick={() => void query.refetch()}>
                Retry
              </Button>
            )
          }
          sx={{ mb: 2 }}
        >
          {missing
            ? 'This project could not be found. It may have been deleted, or the link may be wrong.'
            : query.error?.message || 'The project could not be loaded.'}
        </Alert>
        <BackLink />
      </>
    );
  }

  const project = query.data;
  const context: ProjectOutletContext = { project };
  // A module someone cannot read has no tab here, not an empty one.
  const visibleTabs = canReadTasks
    ? PROJECT_TABS
    : PROJECT_TABS.filter((tab) => tab.to !== 'tasks');
  return (
    <>
      <PageHeader
        title={project.title}
        description={project.summary}
        icon={<AccountTreeIcon />}
        help={pageGuides['project-detail']}
        action={<BackLink />}
      />
      {query.isError && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void query.refetch()}>
              Retry
            </Button>
          }
        >
          This page could not be refreshed, so it may be out of date. {query.error.message}
        </Alert>
      )}
      <ProjectHeaderCard project={project} />
      <DetailTabs tabs={visibleTabs} ariaLabel="Project sections" />
      <Outlet context={context} />
    </>
  );
};

export default ProjectDetailLayout;
