import type { PersonSummary, ProjectListItem } from '@iaa/shared';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { initials } from '../../lib/initials';

import { countLabel, formatDateRange } from './project-format';
import { ProjectPriorityChip, ProjectStatusChip } from './ProjectChips';
import { ProjectProgressBar } from './ProjectProgressBar';

const projectPath = (project: ProjectListItem): string => `/projects/${project.id}`;

/** Columns that give way on narrow screens, so a phone shows name, status and progress. */
const WIDE_ONLY = { display: { xs: 'none', md: 'table-cell' } } as const;

const LeadName = ({ lead }: { lead: PersonSummary | null }): JSX.Element =>
  lead ? (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Avatar
        aria-hidden
        sx={{
          width: 26,
          height: 26,
          fontSize: '0.68rem',
          fontWeight: 750,
          color: 'text.primary',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18),
        }}
      >
        {initials(lead.name)}
      </Avatar>
      <Typography variant="body2" noWrap>
        {lead.name}
      </Typography>
    </Stack>
  ) : (
    <Typography variant="body2" color="text.secondary">
      No lead yet
    </Typography>
  );

/** "2 overdue" beside the progress, so late work is seen from the list. */
const OverdueNote = ({ count }: { count: number }): JSX.Element | null =>
  count > 0 ? (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{ color: 'warning.main', mt: 0.5 }}
    >
      <WarningAmberRoundedIcon sx={{ fontSize: 16 }} aria-hidden />
      <Typography variant="caption" sx={{ fontWeight: 650 }}>
        {countLabel(count, 'task')} overdue
      </Typography>
    </Stack>
  ) : null;

/** "DSH-2026 · 1 Sept 2026 – 30 Jun 2027 · Led by Ama Mensah": the facts under a row's title. */
const rowFacts = (project: ProjectListItem): string =>
  [
    project.code,
    formatDateRange(project.startDate, project.endDate),
    project.lead ? `Led by ${project.lead.name}` : 'No lead yet',
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * The table view: one row per project, linked by its title. Code, dates and
 * lead sit under the title rather than in columns of their own, so the table
 * fits beside the sidebar on a laptop; a phone keeps title, status and
 * progress.
 */
export const ProjectTable = ({ items }: { items: readonly ProjectListItem[] }): JSX.Element => (
  <TableContainer
    sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}
  >
    <Table size="small" aria-label="Projects">
      <TableHead>
        <TableRow>
          <TableCell>Project</TableCell>
          <TableCell>Status</TableCell>
          <TableCell sx={WIDE_ONLY}>Priority</TableCell>
          <TableCell sx={{ width: { xs: 120, sm: 200 } }}>Progress</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((project) => (
          <TableRow key={project.id} hover>
            <TableCell sx={{ py: 1.5, minWidth: 0 }}>
              <Link
                component={RouterLink}
                to={projectPath(project)}
                underline="hover"
                title={project.summary}
                sx={{ fontWeight: 700, color: 'text.primary', display: 'block' }}
              >
                {project.title}
              </Link>
              <Typography variant="caption" color="text.secondary" component="p">
                {rowFacts(project)}
              </Typography>
            </TableCell>
            <TableCell>
              <ProjectStatusChip status={project.status} />
            </TableCell>
            <TableCell sx={WIDE_ONLY}>
              <ProjectPriorityChip priority={project.priority} short />
            </TableCell>
            <TableCell>
              <ProjectProgressBar progress={project.progress} dense />
              <OverdueNote count={project.taskCounts.overdue} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const CARD_GRID = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 2,
} as const;

/** The card view: the cover, the essentials and progress, one card per project. */
export const ProjectCardGrid = ({ items }: { items: readonly ProjectListItem[] }): JSX.Element => (
  <Box component="ul" sx={{ ...CARD_GRID, listStyle: 'none', m: 0, p: 0 }}>
    {items.map((project) => (
      <Card
        component="li"
        key={project.id}
        variant="outlined"
        sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <CardActionArea
          component={RouterLink}
          to={projectPath(project)}
          sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        >
          {/* No placeholder for a missing cover: on a phone it is a screen of empty boxes. */}
          {project.cover && (
            <Box
              component="img"
              src={project.cover.url}
              alt=""
              loading="lazy"
              sx={{ width: '100%', aspectRatio: '16 / 7', objectFit: 'cover', display: 'block' }}
            />
          )}
          <Stack spacing={1.25} sx={{ p: 2, flexGrow: 1 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <ProjectStatusChip status={project.status} />
              <ProjectPriorityChip priority={project.priority} />
            </Stack>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h3" variant="h6" sx={{ lineHeight: 1.3 }}>
                {project.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {project.summary}
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ color: 'text.secondary' }}
            >
              <CalendarMonthOutlinedIcon sx={{ fontSize: 17 }} aria-hidden />
              <Typography variant="caption">
                {formatDateRange(project.startDate, project.endDate)}
              </Typography>
            </Stack>
            <LeadName lead={project.lead} />
            <Box sx={{ mt: 'auto', pt: 0.5 }}>
              <ProjectProgressBar progress={project.progress} dense />
              <OverdueNote count={project.taskCounts.overdue} />
            </Box>
          </Stack>
        </CardActionArea>
      </Card>
    ))}
  </Box>
);

/** The table view while it loads: the same frame with placeholder rows. */
export const ProjectTableSkeleton = ({ rows = 6 }: { rows?: number }): JSX.Element => (
  <TableContainer
    sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}
    aria-hidden
  >
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Project</TableCell>
          <TableCell>Status</TableCell>
          <TableCell sx={WIDE_ONLY}>Priority</TableCell>
          <TableCell sx={{ width: { xs: 120, sm: 200 } }}>Progress</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }, (_, index) => (
          <TableRow key={index}>
            <TableCell sx={{ py: 1.5 }}>
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="90%" sx={{ fontSize: '0.75rem' }} />
            </TableCell>
            <TableCell>
              <Skeleton variant="rounded" width={78} height={24} sx={{ borderRadius: 99 }} />
            </TableCell>
            <TableCell sx={WIDE_ONLY}>
              <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 99 }} />
            </TableCell>
            <TableCell>
              <Skeleton variant="rounded" height={6} sx={{ borderRadius: 99 }} />
              <Skeleton variant="text" width="60%" sx={{ fontSize: '0.75rem' }} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

/** The card view while it loads. */
export const ProjectCardSkeleton = ({ cards = 6 }: { cards?: number }): JSX.Element => (
  <Box sx={CARD_GRID} aria-hidden>
    {Array.from({ length: cards }, (_, index) => (
      <Box
        key={index}
        sx={{ border: 1, borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
      >
        <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 7', height: 'auto' }} />
        <Stack spacing={1.25} sx={{ p: 2 }}>
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={78} height={24} sx={{ borderRadius: 99 }} />
            <Skeleton variant="rounded" width={110} height={24} sx={{ borderRadius: 99 }} />
          </Stack>
          <Skeleton variant="text" width="75%" sx={{ fontSize: '1.25rem' }} />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="rounded" height={6} sx={{ borderRadius: 99 }} />
        </Stack>
      </Box>
    ))}
  </Box>
);
