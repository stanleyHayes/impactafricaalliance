import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';

import { DetailTabs, type DetailTab } from '../detail/DetailTabs';

const TABS: readonly DetailTab[] = [
  { to: '/tasks', label: 'My tasks', icon: <TaskAltRoundedIcon />, end: true },
  { to: '/tasks/all', label: 'All tasks', icon: <FormatListBulletedRoundedIcon />, end: true },
  { to: '/tasks/board', label: 'Board', icon: <ViewKanbanOutlinedIcon />, end: true },
];

/** Switches between the three views of the team's work. Each is its own address. */
export const TaskViewTabs = (): JSX.Element => <DetailTabs tabs={TABS} ariaLabel="Task views" />;
