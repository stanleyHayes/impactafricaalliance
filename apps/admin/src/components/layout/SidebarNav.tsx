import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
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
      sx={{
        minHeight: 44,
        borderRadius: 2,
        mx: 0.75,
        my: 0.25,
        px: 1.25,
        justifyContent: 'center',
        color: 'text.secondary',
        '& .MuiListItemIcon-root': {
          color: 'inherit',
          minWidth: 0,
          mr: 0,
          justifyContent: 'center',
        },
        '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
        '&.active': {
          bgcolor: 'primary.main',
          color: 'common.white',
          boxShadow: '0 6px 16px -8px rgba(26,92,56,0.7)',
          '& .MuiListItemIcon-root': { color: 'common.white' },
          '&:hover': { bgcolor: 'primary.dark' },
        },
      }}
    >
      <ListItemIcon>{item.icon}</ListItemIcon>
    </ListItemButton>
  </Tooltip>
);

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
      '& .MuiListItemButton-root.active ~ .iaa-thread-foot': {
        bgcolor: 'primary.main',
      },
      // Vertical spine: a 1px divider-coloured guide down the gutter. The last
      // child only runs to the centre so the corner reads as a clean `└`.
      '&::before': {
        content: '""',
        position: 'absolute',
        left: `${SPINE_LEFT}px`,
        top: 0,
        bottom: last ? '50%' : 0,
        width: '1px',
        bgcolor: 'divider',
        pointerEvents: 'none',
      },
    }}
  >
    <ListItemButton
      component={NavLink}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      sx={{
        position: 'relative',
        minHeight: 40,
        borderRadius: 2,
        ml: `${SPINE_LEFT + TICK_WIDTH}px`,
        mr: 1.5,
        my: 0.25,
        px: 1.25,
        justifyContent: 'flex-start',
        color: 'text.secondary',
        '& .MuiListItemIcon-root': {
          color: 'inherit',
          minWidth: 0,
          mr: 1.5,
          justifyContent: 'center',
          '& .MuiSvgIcon-root': { fontSize: 20 },
        },
        '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
        '&.active': {
          bgcolor: 'primary.main',
          color: 'common.white',
          boxShadow: '0 6px 16px -8px rgba(26,92,56,0.7)',
          '& .MuiListItemIcon-root': { color: 'common.white' },
          '&:hover': { bgcolor: 'primary.dark' },
        },
      }}
    >
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2', noWrap: true } }} />
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
        bgcolor: 'divider',
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
  const groups = buildNavGroups(user);
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
              sx={{
                borderRadius: 2,
                mx: 1.5,
                py: 0.25,
                pl: 1,
                '&:hover': { bgcolor: 'transparent' },
              }}
            >
              <ListItemText
                primary={group.title}
                slotProps={{
                  primary: {
                    variant: 'overline',
                    sx: { fontWeight: 700, letterSpacing: 1, color: 'text.secondary' },
                  },
                }}
              />
              {open ? (
                <ExpandLess fontSize="small" sx={{ color: 'text.disabled' }} aria-hidden />
              ) : (
                <ExpandMore fontSize="small" sx={{ color: 'text.disabled' }} aria-hidden />
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
