import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface DetailTab {
  /**
   * Where the tab goes, resolved like any router link: relative to the route
   * that renders the tabs, so `'.'` is the layout's own page and `'tasks'` its
   * child.
   */
  to: string;
  label: string;
  icon?: JSX.Element;
  /**
   * Active only on an exact match. Set it on the tab for the layout's own page,
   * or that tab stays lit on every child route.
   */
  end?: boolean;
}

export interface DetailTabsProps {
  tabs: readonly DetailTab[];
  /** Names the tab bar for screen readers, such as "Project sections". */
  ariaLabel: string;
}

/**
 * The section switcher on a detail page with routed tabs: a project's
 * Overview, Tasks, Milestones and so on.
 *
 * Links rather than an ARIA tab widget, because each tab is its own address:
 * it can be bookmarked, shared and reopened, and Back works. The router marks
 * the current one (`aria-current="page"`), so the highlight always matches the
 * page. The caller renders the `<Outlet />` for the tab's content.
 *
 * On a phone the row scrolls sideways, and the current tab is scrolled into
 * view so a deep link to the last tab does not leave it off screen.
 */
export const DetailTabs = ({ tabs, ariaLabel }: DetailTabsProps): JSX.Element => {
  const barRef = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const current = barRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    // jsdom and older browsers lack scrollIntoView's options; skip rather than throw.
    if (typeof current?.scrollIntoView === 'function') {
      current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [pathname]);

  return (
    <Box
      component="nav"
      ref={barRef}
      aria-label={ariaLabel}
      sx={{
        display: 'flex',
        gap: 0.75,
        mb: 3,
        p: 0.75,
        overflowX: 'auto',
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {tabs.map((tab) => (
        <Box
          key={tab.to}
          component={NavLink}
          to={tab.to}
          end={tab.end}
          sx={{
            display: 'inline-flex',
            flexShrink: 0,
            minHeight: 40,
            alignItems: 'center',
            gap: 1,
            px: 1.75,
            borderRadius: 2,
            color: 'text.secondary',
            fontSize: '0.875rem',
            fontWeight: 650,
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            transition: 'background-color 160ms ease, color 160ms ease',
            '& svg': { fontSize: 19 },
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
              color: 'text.primary',
            },
            '&:focus-visible': {
              outline: 2,
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
            '&.active': {
              bgcolor: 'primary.main',
              color: 'common.black',
              boxShadow: '0 9px 20px -14px rgba(18,63,41,0.85)',
            },
          }}
        >
          {tab.icon}
          {tab.label}
        </Box>
      ))}
    </Box>
  );
};
