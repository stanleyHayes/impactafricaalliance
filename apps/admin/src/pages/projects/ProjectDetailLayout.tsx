import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Link as RouterLink, Outlet } from 'react-router-dom';

import { DetailTabs, type DetailTab } from '../../components/detail/DetailTabs';
import { PageHeader } from '../../components/PageHeader';
import { pageGuides } from '../../lib/page-guides';

/**
 * The project's sections, one route each under `/projects/:projectId`.
 * Relative, so they resolve against whichever project is open.
 */
const PROJECT_TABS: readonly DetailTab[] = [
  { to: '.', label: 'Overview', icon: <DashboardOutlinedIcon />, end: true },
  { to: 'tasks', label: 'Tasks', icon: <AssignmentTurnedInOutlinedIcon /> },
  { to: 'milestones', label: 'Milestones', icon: <FlagOutlinedIcon /> },
  { to: 'media', label: 'Media', icon: <PhotoLibraryOutlinedIcon /> },
  { to: 'impact', label: 'Impact', icon: <AutoStoriesOutlinedIcon /> },
  { to: 'documents', label: 'Documents', icon: <FolderOutlinedIcon /> },
  { to: 'activity', label: 'Activity', icon: <HistoryRoundedIcon /> },
];

/**
 * The frame around every project tab: header, section tabs, and the tab's
 * own content through `<Outlet />`.
 *
 * Placeholder until the projects module lands. The nested routes, the tabs
 * and the permission check around them are already final; the header gains
 * the project's own title and actions when the module replaces this file.
 */
const ProjectDetailLayout = (): JSX.Element => (
  <Box>
    <Button
      component={RouterLink}
      to="/projects"
      startIcon={<ArrowBackRoundedIcon />}
      sx={{ mb: 2 }}
    >
      All projects
    </Button>
    <PageHeader
      title="Project"
      description="Plans, people, progress and evidence for one initiative."
      icon={<AccountTreeIcon />}
      help={pageGuides['project-detail']}
    />
    <DetailTabs tabs={PROJECT_TABS} ariaLabel="Project sections" />
    <Outlet />
  </Box>
);

export default ProjectDetailLayout;
