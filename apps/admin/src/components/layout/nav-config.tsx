import { UserRole, type PublicUser } from '@iaa/shared';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CollectionsIcon from '@mui/icons-material/Collections';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GroupsIcon from '@mui/icons-material/Groups';
import HandshakeIcon from '@mui/icons-material/Handshake';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import ImageIcon from '@mui/icons-material/Image';
import InboxIcon from '@mui/icons-material/Inbox';
import InsightsIcon from '@mui/icons-material/Insights';
import LockResetIcon from '@mui/icons-material/LockReset';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import MailIcon from '@mui/icons-material/MarkEmailRead';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import PublicIcon from '@mui/icons-material/Public';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SettingsIcon from '@mui/icons-material/Settings';
import ShareIcon from '@mui/icons-material/Share';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlineOutlined';

import { mayOpenPath } from '../../auth/may-open';
import { RESOURCES } from '../../resources/registry';

export interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
  /** Match the route exactly (used for the index "/" Dashboard link). */
  end?: boolean;
  /** Unread count shown as a badge. Omitted or 0 renders nothing. */
  badge?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Per-resource icon for the Content group (each key gets a distinct icon). */
const CONTENT_ICONS: Record<string, JSX.Element> = {
  articles: <NewspaperIcon />,
  stories: <AutoStoriesIcon />,
  team: <Diversity3Icon />,
  partners: <HandshakeIcon />,
  reports: <AssessmentIcon />,
  jobs: <WorkOutlineIcon />,
  gallery: <CollectionsIcon />,
  stats: <InsightsIcon />,
  offices: <PlaceIcon />,
  'pillar-images': <ImageIcon />,
  'site-images': <WallpaperIcon />,
};

/** Live counts shown as badges beside the sidebar links. */
export interface NavCounts {
  /** Unread submissions, keyed by submission type. */
  submissionsByType?: Record<string, number>;
  submissionsTotal?: number;
  /** The signed-in person's tasks that are overdue or due today. */
  tasksDue?: number;
  /** Applications submitted and not yet picked up for review. */
  applicationsNew?: number;
}

/** Build the grouped sidebar navigation, filtered to what the user may access. */
export const buildNavGroups = (user: PublicUser | null, counts: NavCounts = {}): NavGroup[] => {
  const byType = counts.submissionsByType ?? {};
  const operations: NavItem[] = [
    // Reviews lead: a comment waiting for approval is not on the site until
    // somebody looks at it, so it is the most time-sensitive thing here.
    { to: '/reviews', label: 'Reviews', icon: <RateReviewIcon /> },
    // `end` so the combined inbox does not also light up on its child routes
    // (/submissions/partners and /submissions/mentors both prefix-match it).
    {
      to: '/submissions',
      label: 'Submissions',
      icon: <InboxIcon />,
      end: true,
      badge: counts.submissionsTotal,
    },
    {
      to: '/submissions/partners',
      label: 'Partner enquiries',
      icon: <HandshakeIcon />,
      badge: byType.partner,
    },
    {
      to: '/submissions/mentors',
      label: 'Mentor applications',
      icon: <VolunteerActivismIcon />,
      badge: byType.volunteer,
    },
    { to: '/subscribers', label: 'Subscribers', icon: <MailIcon /> },
    { to: '/events', label: 'Events', icon: <CalendarMonthIcon /> },
    { to: '/donations', label: 'Donations', icon: <VolunteerActivismIcon /> },
    { to: '/privacy-requests', label: 'Privacy Requests', icon: <PrivacyTipIcon /> },
  ];
  if (user?.role === UserRole.Admin) {
    operations.push({ to: '/users', label: 'Users', icon: <GroupsIcon /> });
  }

  const siteItems: NavItem[] = [
    { to: '/site-settings', label: 'Site settings', icon: <PublicIcon /> },
  ];
  if (user?.role === UserRole.Admin) {
    siteItems.push({ to: '/social-connections', label: 'Social connections', icon: <ShareIcon /> });
  }

  const groups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { to: '/', label: 'Dashboard', icon: <DashboardIcon />, end: true },
        { to: '/analytics', label: 'Website traffic', icon: <InsightsIcon /> },
      ],
    },
    {
      title: 'Work',
      items: [
        { to: '/projects', label: 'Projects', icon: <AccountTreeIcon /> },
        // Counts what needs doing now, not everything open: a badge that
        // never goes down stops being read.
        { to: '/tasks', label: 'Tasks', icon: <TaskAltIcon />, badge: counts.tasksDue },
      ],
    },
    {
      title: 'Applications',
      items: [
        { to: '/forms', label: 'Forms', icon: <DynamicFormIcon /> },
        // `end` so the list does not also light up on the review queue, which
        // sits under the same path.
        {
          to: '/applications',
          label: 'Applications',
          icon: <AssignmentIndIcon />,
          end: true,
          badge: counts.applicationsNew,
        },
        { to: '/applications/review', label: 'Review queue', icon: <FactCheckIcon /> },
      ],
    },
    {
      title: 'Content',
      items: [
        // The library sits with content because that is where an editor looks
        // for a picture, not under a settings heading.
        { to: '/media', label: 'Media library', icon: <CollectionsIcon /> },
        // Ahead of the CMS lists: the long stories are what the Impact pages
        // are built from. The short home-page quotes are Testimonials, below.
        { to: '/impact-stories', label: 'Impact stories', icon: <HistoryEduIcon /> },
        ...RESOURCES.map((resource) => ({
          to: `/content/${resource.key}`,
          label: resource.label,
          icon: CONTENT_ICONS[resource.key] ?? <NewspaperIcon />,
        })),
      ],
    },
    {
      title: 'Operations',
      items: operations,
    },
    {
      title: 'Site',
      items: siteItems,
    },
    {
      title: 'Account',
      items: [
        { to: '/account/profile', label: 'Profile', icon: <PersonIcon /> },
        { to: '/account/edit', label: 'Edit Profile', icon: <ManageAccountsIcon /> },
        { to: '/account/password', label: 'Update Password', icon: <LockResetIcon /> },
        { to: '/account/notifications', label: 'Notifications', icon: <NotificationsIcon /> },
        { to: '/account/settings', label: 'Settings', icon: <SettingsIcon /> },
      ],
    },
  ];
  const mayRead = (item: NavItem): boolean => mayOpenPath(user, item.to);
  return groups
    .map((group) => ({ ...group, items: group.items.filter(mayRead) }))
    .filter((group) => group.items.length > 0);
};
