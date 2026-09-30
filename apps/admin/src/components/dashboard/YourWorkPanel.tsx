import type { SvgIconComponent } from '@mui/icons-material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import ReportGmailerrorredOutlinedIcon from '@mui/icons-material/ReportGmailerrorredOutlined';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import { useApplicationCounts } from '../../lib/applications';
import { useStoriesInReviewCount } from '../../lib/impact-stories';
import { useActiveProjectCount } from '../../lib/projects';
import { useTaskSummary } from '../../lib/tasks';
import { focusRingSx, skinned, surfaceSx, tokenVar } from '../../theme/surfaces';

/** How a tile's number is coloured: a warning only when something is late. */
type Tone = 'alert' | 'attention' | 'calm';

const TONE_COLOUR: Record<Tone, (theme: Theme) => string> = {
  alert: (theme) => theme.palette.error.main,
  attention: (theme) => theme.palette.warning.main,
  calm: (theme) => theme.palette.primary.main,
};

interface WorkTile {
  key: string;
  label: string;
  /** What the number means, in a few words. */
  caption: string;
  to: string;
  icon: SvgIconComponent;
  value: number | undefined;
  tone: Tone;
  loading: boolean;
  failed: boolean;
  retry: () => void;
}

/**
 * A tile sits inside the panel's card, so it is the skin's nested card: less
 * depth than the panel, so the shadows do not double up (Classic: paper with
 * a hairline, like any card).
 */
const tileSurface = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.75,
  minWidth: 0,
  height: '100%',
  p: 2,
  borderRadius: 2.5,
  ...surfaceSx.nested,
} as const;

/**
 * A tile that links somewhere. Classic lifts it on a glow in its tone under
 * the pointer; a skin lifts it on its own hover shadow instead (the edge
 * still takes the tone) and presses it in while it is clicked.
 */
const TILE_LINK_SKIN = skinned(
  {},
  {
    '&:hover': { boxShadow: tokenVar('surfaceHoverShadow') },
    '&:active': { boxShadow: tokenVar('surfacePressedShadow') },
  },
);

const TileHeading = ({ tile }: { tile: WorkTile }): JSX.Element => {
  const Icon = tile.icon;
  return (
    // The label wraps rather than being cut to "New applicatio…" in a narrow
    // tile, as the dashboard's stat cards do; the icon stays on its first line.
    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
      <Icon
        aria-hidden
        fontSize="small"
        sx={{ color: 'text.secondary', flexShrink: 0, mt: '1px' }}
      />
      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>
        {tile.label}
      </Typography>
    </Stack>
  );
};

/**
 * One count. A link to the list it counts once it has loaded; while loading it
 * keeps the same shape with a placeholder number, and after a failure it says
 * so with a Retry, which cannot sit inside a link.
 */
const Tile = ({ tile }: { tile: WorkTile }): JSX.Element => {
  if (tile.failed) {
    return (
      <Box sx={tileSurface}>
        <TileHeading tile={tile} />
        <Typography variant="body2" color="text.secondary">
          This count could not be loaded.
        </Typography>
        <Box>
          <Button size="small" onClick={tile.retry} sx={{ ml: -0.75 }}>
            Retry
          </Button>
        </Box>
      </Box>
    );
  }
  const value = tile.value ?? 0;
  // Late or waiting work is coloured only when there is some; a zero is calm.
  const tone: Tone = value > 0 ? tile.tone : 'calm';
  return (
    <Box
      component={RouterLink}
      to={tile.to}
      aria-busy={tile.loading || undefined}
      sx={[
        {
          ...tileSurface,
          color: 'inherit',
          textDecoration: 'none',
          transition: (theme) =>
            theme.transitions.create(['border-color', 'box-shadow'], {
              duration: theme.transitions.duration.shorter,
            }),
          '&:hover': {
            borderColor: (theme) => alpha(TONE_COLOUR[tone](theme), 0.5),
            boxShadow: (theme) => `0 10px 24px -18px ${alpha(TONE_COLOUR[tone](theme), 0.8)}`,
          },
          // The skin's ring (Classic's is this same 2px primary outline).
          '&:focus-visible': focusRingSx,
        },
        TILE_LINK_SKIN,
      ]}
    >
      <TileHeading tile={tile} />
      {tile.loading ? (
        <Skeleton width={48} sx={{ fontSize: '2rem' }} />
      ) : (
        <Typography
          component="p"
          variant="h4"
          sx={{
            fontWeight: 800,
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
            color: tone === 'calm' ? 'text.primary' : (theme) => TONE_COLOUR[tone](theme),
          }}
        >
          {value}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {tile.caption}
      </Typography>
    </Box>
  );
};

/** The loading, failure and retry parts of a query that a tile needs. */
const stateOf = (
  query: Pick<UseQueryResult<unknown>, 'isPending' | 'isError' | 'refetch'>,
): Pick<WorkTile, 'loading' | 'failed' | 'retry'> => ({
  loading: query.isPending,
  failed: query.isError,
  retry: () => void query.refetch(),
});

/**
 * The tiles this person may see. Each is asked for only with the permission
 * to open the page it links to, so nobody is shown a count they cannot act
 * on, and nobody without `applications:read` learns how many people applied.
 */
const useWorkTiles = (): WorkTile[] => {
  const can = useCan();
  const readTasks = can('read', 'tasks');
  const readProjects = can('read', 'projects');
  const readApplications = can('read', 'applications');
  const readStories = can('read', 'impact-stories');
  const tasks = useTaskSummary(readTasks);
  const projects = useActiveProjectCount(readProjects);
  const applications = useApplicationCounts(readApplications);
  const stories = useStoriesInReviewCount(readStories);

  const tiles: WorkTile[] = [];
  if (readTasks) {
    const shared = { to: '/tasks', ...stateOf(tasks) };
    tiles.push(
      {
        key: 'overdue',
        label: 'Overdue',
        caption: 'Your tasks past their due date',
        icon: ReportGmailerrorredOutlinedIcon,
        value: tasks.data?.overdue,
        tone: 'alert',
        ...shared,
      },
      {
        key: 'today',
        label: 'Due today',
        caption: 'Your tasks due today',
        icon: TodayOutlinedIcon,
        value: tasks.data?.dueToday,
        tone: 'attention',
        ...shared,
      },
      {
        key: 'upcoming',
        label: 'Upcoming',
        caption: 'Your tasks due later',
        icon: EventOutlinedIcon,
        value: tasks.data?.upcoming,
        tone: 'calm',
        ...shared,
      },
    );
  }
  if (readProjects) {
    tiles.push({
      key: 'projects',
      label: 'Active projects',
      caption: 'Under way across the team',
      to: '/projects?status=active',
      icon: AccountTreeOutlinedIcon,
      value: projects.data,
      tone: 'calm',
      ...stateOf(projects),
    });
  }
  if (readApplications) {
    tiles.push({
      key: 'applications',
      label: 'New applications',
      caption: 'Sent and not yet reviewed',
      to: '/applications?status=submitted',
      icon: AssignmentIndOutlinedIcon,
      value: applications.data?.submitted,
      tone: 'attention',
      ...stateOf(applications),
    });
  }
  if (readStories) {
    tiles.push({
      key: 'stories',
      label: 'Stories in review',
      caption: 'Waiting for an administrator',
      to: '/impact-stories',
      icon: HistoryEduOutlinedIcon,
      value: stories.data,
      tone: 'attention',
      ...stateOf(stories),
    });
  }
  return tiles;
};

/**
 * "Your work" on the dashboard (plan §4.4): the caller's own overdue, due
 * today and upcoming tasks, active projects, new applications and stories
 * waiting to be published, each linking to the list behind it.
 *
 * Pull-based on purpose (plan D12): there are no task notifications yet, so
 * this and the Tasks badge are how work due today is noticed. Renders nothing
 * for someone who can read none of these modules.
 */
export const YourWorkPanel = (): JSX.Element | null => {
  const tiles = useWorkTiles();
  if (tiles.length === 0) {
    return null;
  }
  return (
    <Card
      component="section"
      variant="outlined"
      aria-labelledby="your-work-heading"
      sx={{ borderRadius: 3, borderColor: tokenVar('surfaceBorderColor') }}
    >
      <Box
        // Classic's own faint tint; a skin's tinted header strip.
        sx={skinned(
          { px: 2.75, py: 2.25, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.035) },
          surfaceSx.tinted,
        )}
      >
        <Typography id="your-work-heading" variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          Your work
        </Typography>
        <Typography variant="caption" color="text.secondary">
          What needs you now, and what the team has on
        </Typography>
      </Box>
      <Divider />
      <Box
        component="ul"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 2,
          display: 'grid',
          gap: 1.5,
          // As many columns as fit: two on a phone, all six on a wide screen.
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))',
        }}
      >
        {tiles.map((tile) => (
          <Box component="li" key={tile.key} sx={{ minWidth: 0 }}>
            <Tile tile={tile} />
          </Box>
        ))}
      </Box>
    </Card>
  );
};
