export interface TourStep {
  id: string;
  targetId?: string;
  title: string;
  body: string;
  placement?: 'bottom' | 'left' | 'right' | 'top';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to IAA Admin',
    body: 'A quick walkthrough of your workspace. You can replay this tour any time from your account menu.',
  },
  {
    id: 'sidebar',
    targetId: 'admin-sidebar-nav',
    placement: 'right',
    title: 'Sidebar navigation',
    body: 'Jump between Dashboard, Content modules, Operations, Site settings and your Account.',
  },
  {
    id: 'stats',
    targetId: 'admin-dashboard-stats',
    placement: 'bottom',
    title: 'Dashboard snapshot',
    body: 'See submissions, subscribers, donations and recent activity at a glance.',
  },
  {
    id: 'theme',
    targetId: 'admin-topbar-actions',
    placement: 'bottom',
    title: 'Make it yours',
    body: 'Choose a brand theme and switch between light and dark modes.',
  },
  {
    id: 'notifications',
    targetId: 'admin-notifications-button',
    placement: 'bottom',
    title: 'Stay in the loop',
    body: 'New submissions and alerts appear here.',
  },
  {
    id: 'help',
    targetId: 'admin-page-help',
    placement: 'bottom',
    title: 'Page help',
    body: 'The ? button on each page explains what you can do here, with an optional audio guide.',
  },
  {
    id: 'account',
    targetId: 'admin-user-menu',
    placement: 'bottom',
    title: 'Your account',
    body: 'Manage your profile, settings, and log out.',
  },
  {
    id: 'finish',
    title: 'You\'re all set',
    body: 'That\'s the basics. Dive into the dashboard and manage content with confidence.',
  },
];
