import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { useNewSubmissionCounts } from '../../lib/admin-hooks';
import { useApplicationCounts } from '../../lib/applications';
import { useTaskSummary } from '../../lib/tasks';
import { focusRingSx, navSx, skinned, tokenVar } from '../../theme/surfaces';

import { buildNavGroups, type NavItem } from './nav-config';

interface SidebarNavProps {
  /** Mini icon-only rail (desktop collapsed). */
  collapsed: boolean;
  /** Called when a link is clicked — used to close the mobile drawer. */
  onNavigate?: () => void;
}

/**
 * File-tree geometry for the threaded expanded mode (px from the group's left
 * edge). The vertical spine is anchored at SPINE_LEFT just inside the parent
 * title's indent; each child draws a short horizontal L-foot of TICK_WIDTH from
 * that spine, and its content begins after the foot so it reads as nesting.
 */
const SPINE_LEFT = 22;
const TICK_WIDTH = 12;

/**
 * A nav row's look, idle, under the pointer and as the current page, from
 * the skin's nav tokens. Classic's are this sidebar's own: secondary text,
 * the hover fill, and a primary pill for the current page whose text takes
 * whichever of black and white contrasts with the fill (black read at only
 * 3.7:1 on Aura's violet; checked for every preset in theme.test). Neumorphism
 * presses the current row in instead, and every skin's colours are checked
 * the same way.
 *
 * The current row comes after the hover so it wins under the pointer too,
 * as it always has.
 */
const NAV_ROW = {
  color: navSx.link.color,
  '&:hover': navSx.link['&:hover'],
  '&.active': navSx.active,
};

/**
 * Keyboard focus on a nav row. Classic keeps MUI's focus fill, exactly as it
 * was; a skin draws its ring outside the row, where it still shows around
 * the filled current row (an inside ring in the primary would vanish on it).
 */
const NAV_ROW_FOCUS = skinned({}, { '&.Mui-focusVisible, &:focus-visible': focusRingSx });

/**
 * Collapsed icon-rail link: icon-only ListItemButton wrapped in a right-placed
 * tooltip. Kept identical to the original rail behaviour — no thread, no title.
 */
const RailNavLink = ({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}): JSX.Element => (
  <Tooltip title={item.label} placement="right" arrow>
    <ListItemButton
      component={NavLink}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      sx={[
        {
          minHeight: 44,
          borderRadius: 2,
          mx: 0.75,
          my: 0.25,
          px: 1.25,
          justifyContent: 'center',
          '& .MuiListItemIcon-root': {
            color: 'inherit',
            minWidth: 0,
            mr: 0,
            justifyContent: 'center',
          },
          ...NAV_ROW,
        },
        NAV_ROW_FOCUS,
      ]}
    >
      <ListItemIcon>
        <Badge
          badgeContent={item.badge ?? 0}
          color="error"
          max={99}
          overlap="circular"
          sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', height: 15, minWidth: 15 } }}
        >
          {item.icon}
        </Badge>
      </ListItemIcon>
    </ListItemButton>
  </Tooltip>
);

/**
 * Count pill for an expanded nav row. Sits after the label rather than on the
 * icon, so a two-digit count cannot overlap the text.
 */
const NavBadge = ({ count }: { count?: number }): JSX.Element | null =>
  count && count > 0 ? (
    <Box
      component="span"
      aria-label={`${count} unread`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        px: 0.75,
        borderRadius: 10,
        ...navSx.badge,
        fontSize: '0.68rem',
        fontWeight: 800,
        // Where the current row is a filled pill, the count turns black to
        // stay legible on it (Neumorphism's pressed row keeps it red).
        '.active &': navSx.badgeOnActive,
      }}
    >
      {count > 99 ? '99+' : count}
    </Box>
  ) : null;

/**
 * Expanded, threaded child link: hangs off the group spine via an L-shaped
 * connector (vertical `::before` spine + horizontal `::after` foot) drawn in the
 * left gutter. For the last child the spine stops at the row's vertical centre,
 * forming the `└` corner of a file tree. When the child's route is active, the
 * NavLink picks up the `active` class — the adjacent-sibling selector then lights
 * the connector's foot in primary.main so the thread highlights the current
 * branch. The connector lives entirely in the gutter to the LEFT of the button,
 * so the filled active pill (primary.main, white text/icon, shadow) renders on
 * top without the line ever crossing it.
 */
const ThreadedNavLink = ({
  item,
  last,
  onNavigate,
}: {
  item: NavItem;
  /** Last child in the group — the vertical spine stops at this row's centre. */
  last: boolean;
  onNavigate?: () => void;
}): JSX.Element => (
  <Box
    sx={{
      position: 'relative',
      // Active link -> light up its connector foot in primary.main so the
      // thread highlights exactly where you are (keyed off NavLink's class).
      '& .MuiListItemButton-root.active ~ .iaa-thread-foot': navSx.spineActive,
      // Vertical spine: a 1px divider-coloured guide down the gutter. The last
      // child only runs to the centre so the corner reads as a clean `└`.
      '&::before': {
        content: '""',
        position: 'absolute',
        left: `${SPINE_LEFT}px`,
        top: 0,
        bottom: last ? '50%' : 0,
        width: '1px',
        ...navSx.spine,
        pointerEvents: 'none',
      },
    }}
  >
    <ListItemButton
      component={NavLink}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      sx={[
        {
          position: 'relative',
          minHeight: 40,
          borderRadius: 2,
          ml: `${SPINE_LEFT + TICK_WIDTH}px`,
          mr: 1.5,
          my: 0.25,
          px: 1.25,
          justifyContent: 'flex-start',
          '& .MuiListItemIcon-root': {
            color: 'inherit',
            minWidth: 0,
            mr: 1.5,
            justifyContent: 'center',
            '& .MuiSvgIcon-root': { fontSize: 20 },
          },
          ...NAV_ROW,
        },
        NAV_ROW_FOCUS,
      ]}
    >
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText
        primary={item.label}
        slotProps={{ primary: { variant: 'body2', noWrap: true } }}
      />
      <NavBadge count={item.badge} />
    </ListItemButton>
    {/* Horizontal L-foot reaching from the spine toward the item. Rendered after
        the button so the `.active ~` sibling selector can recolour it. */}
    <Box
      className="iaa-thread-foot"
      aria-hidden
      sx={{
        position: 'absolute',
        left: `${SPINE_LEFT}px`,
        top: '50%',
        width: `${TICK_WIDTH}px`,
        height: '1px',
        ...navSx.spine,
        pointerEvents: 'none',
        transition: (t) =>
          t.transitions.create('background-color', {
            duration: t.transitions.duration.shortest,
          }),
      }}
    />
  </Box>
);

/** Grouped, collapsible sidebar navigation. Collapses to an icon rail on desktop. */
export const SidebarNav = ({ collapsed, onNavigate }: SidebarNavProps): JSX.Element => {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];
  const { data: counts } = useNewSubmissionCounts(permissions.includes('submissions:read'));
  // Each badge is only asked for by people who can open the page it counts.
  const { data: tasks } = useTaskSummary(permissions.includes('tasks:read'));
  const { data: applications } = useApplicationCounts(permissions.includes('applications:read'));
  const groups = buildNavGroups(user, {
    submissionsTotal: counts?.total,
    submissionsByType: counts?.byType,
    tasksDue: tasks ? tasks.overdue + tasks.dueToday : undefined,
    applicationsNew: applications?.submitted,
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group) => [group.title, true])),
  );

  const toggleGroup = (title: string): void =>
    setOpenGroups((prev) => ({ ...prev, [title]: !(prev[title] ?? true) }));

  if (collapsed) {
    return (
      <List sx={{ py: 0.5 }}>
        {groups.map((group, index) => (
          <Box key={group.title}>
            {index > 0 && <Divider sx={{ my: 0.75, mx: 1.5 }} />}
            {group.items.map((item) => (
              <RailNavLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </Box>
        ))}
      </List>
    );
  }

  return (
    <List sx={{ py: 0.5 }}>
      {groups.map((group) => {
        const open = openGroups[group.title] ?? true;
        const panelId = `nav-group-${group.title.toLowerCase().replace(/\s+/g, '-')}`;
        return (
          <Box key={group.title} sx={{ mb: 0.5 }}>
            {/* Parent node: the group title sits at the top of the spine and
                toggles the threaded children below via an accessible button. */}
            <ListItemButton
              onClick={() => toggleGroup(group.title)}
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={`${open ? 'Collapse' : 'Expand'} ${group.title}`}
              disableRipple
              // Classic's heading stays flat under the pointer; a skin lets it
              // answer like the rows it opens and closes.
              sx={skinned(
                {
                  borderRadius: 2,
                  mx: 1.5,
                  py: 0.25,
                  pl: 1,
                  '&:hover': { bgcolor: 'transparent' },
                },
                {
                  '&:hover': {
                    bgcolor: tokenVar('navHoverBg'),
                    boxShadow: tokenVar('navHoverShadow'),
                  },
                  '&.Mui-focusVisible': focusRingSx,
                },
              )}
            >
              <ListItemText
                primary={group.title}
                slotProps={{
                  primary: {
                    variant: 'overline',
                    sx: { fontWeight: 700, letterSpacing: 1, ...navSx.heading },
                  },
                }}
              />
              {open ? (
                <ExpandLess fontSize="small" sx={navSx.chevron} aria-hidden />
              ) : (
                <ExpandMore fontSize="small" sx={navSx.chevron} aria-hidden />
              )}
            </ListItemButton>
            {/* Children: threaded beneath the parent on one continuous guide. */}
            <Collapse id={panelId} in={open} timeout="auto" unmountOnExit>
              <Box sx={{ position: 'relative', mx: 1.5 }}>
                {group.items.map((item, itemIndex) => (
                  <ThreadedNavLink
                    key={item.to}
                    item={item}
                    last={itemIndex === group.items.length - 1}
                    onNavigate={onNavigate}
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </List>
  );
};
