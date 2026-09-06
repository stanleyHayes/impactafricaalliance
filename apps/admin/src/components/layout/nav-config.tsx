import { UserRole, type PublicUser } from '@iaa/shared';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CollectionsIcon from '@mui/icons-material/Collections';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import GroupsIcon from '@mui/icons-material/Groups';
import HandshakeIcon from '@mui/icons-material/Handshake';
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
import SettingsIcon from '@mui/icons-material/Settings';
import ShareIcon from '@mui/icons-material/Share';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlineOutlined';

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

/** Build the grouped sidebar navigation, filtered to what the user may access. */
export interface NavCounts {
  /** Unread submissions, keyed by submission type. */
  submissionsByType?: Record<string, number>;
  submissionsTotal?: number;
}

export const buildNavGroups = (user: PublicUser | null, counts: NavCounts = {}): NavGroup[] => {
  const byType = counts.submissionsByType ?? {};
  const operations: NavItem[] = [
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

  return [
    {
      title: 'Overview',
      items: [{ to: '/', label: 'Dashboard', icon: <DashboardIcon />, end: true }],
    },
    {
      title: 'Content',
      items: [
        // The library sits with content because that is where an editor looks
        // for a picture, not under a settings heading.
        { to: '/media', label: 'Media library', icon: <CollectionsIcon /> },
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
};
