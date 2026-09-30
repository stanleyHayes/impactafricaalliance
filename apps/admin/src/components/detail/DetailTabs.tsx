import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { focusRingSx, navSx, skinned, surfaceSx, tokenVar } from '../../theme/surfaces';

/**
 * A tab in the strip. Classic's look is its own (a primary hover tint, a
 * deeper shadow under the current tab), so it is kept exactly; a skin makes
 * the tabs behave like its sidebar rows: the same hover, the same current
 * row (a filled pill, or Neumorphism's pressed-in row) and its focus ring.
 */
const tabSkin = {
  transition: 'background-color 160ms ease, color 160ms ease, box-shadow 160ms ease',
  '&:hover': {
    bgcolor: tokenVar('navHoverBg'),
    color: tokenVar('navHoverColor'),
    boxShadow: tokenVar('navHoverShadow'),
  },
  '&:focus-visible': { ...focusRingSx, outlineColor: tokenVar('focusRingColor') },
  '&.active': navSx.active,
};

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
 * On a phone the row scrolls sideways, and the row is scrolled to the current
 * tab so a deep link to the last tab does not leave it off screen. The window
 * itself never moves.
 */
export const DetailTabs = ({ tabs, ariaLabel }: DetailTabsProps): JSX.Element => {
  const barRef = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const bar = barRef.current;
    const current = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!bar || !current) return;
    // Only the strip scrolls, sideways, to centre the current tab. Not
    // scrollIntoView: on a phone the strip starts below the fold, and that
    // would scroll the window too, opening the page with its title under
    // the app bar.
    const offset = current.getBoundingClientRect().left - bar.getBoundingClientRect().left;
    const left = Math.max(0, bar.scrollLeft + offset - (bar.clientWidth - current.offsetWidth) / 2);
    // jsdom and some older browsers have no element scrollTo; set it directly.
    if (typeof bar.scrollTo === 'function') bar.scrollTo({ left });
    else bar.scrollLeft = left;
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
        borderRadius: 3,
        ...surfaceSx.card,
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
          sx={skinned(
            {
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
                // Black read well on the green presets but not on Aura's
                // violet; the palette picks whichever contrasts, as the sidebar does.
                color: (theme) => theme.palette.getContrastText(theme.palette.primary.main),
                boxShadow: '0 9px 20px -14px rgba(18,63,41,0.85)',
              },
            },
            tabSkin,
          )}
        >
          {tab.icon}
          {tab.label}
        </Box>
      ))}
    </Box>
  );
};
