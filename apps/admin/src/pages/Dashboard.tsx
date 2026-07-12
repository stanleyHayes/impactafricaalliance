import { DonationStatus, SubmissionType, brandColors, type Submission } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MailOutlineIcon from '@mui/icons-material/MailOutlineOutlined';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { CardListSkeleton } from '../components/CardListSkeleton';
import { PageHeader } from '../components/PageHeader';
import {
  useDonations,
  useSubmissions,
  useSubscribers,
  useUsers,
} from '../lib/admin-hooks';
import { formatUtcShort } from '../lib/date';
import { pageGuides } from '../lib/page-guides';
import { RESOURCES } from '../resources/registry';

/** USD formatter — Donation.amountUsd is whole dollars (see payment.ts), not minor units. */
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return formatUtcShort(iso);
};

/** Per-submission-type presentation. */
const SUBMISSION_META: Record<
  Submission['type'],
  { label: string; icon: SvgIconComponent; color: string }
> = {
  [SubmissionType.Contact]: { label: 'Contact', icon: MailOutlineIcon, color: brandColors.forestGreen },
  [SubmissionType.Partner]: { label: 'Partner', icon: HandshakeIcon, color: brandColors.gold },
  [SubmissionType.Volunteer]: { label: 'Volunteer', icon: VolunteerActivismIcon, color: brandColors.mint },
  [SubmissionType.Job]: { label: 'Job', icon: WorkOutlineOutlinedIcon, color: brandColors.deepForest },
};

/** Pull a human label + supporting line from an untyped submission payload, defensively. */
const describeSubmission = (
  submission: Submission,
): { title: string; detail: string } => {
  const p = submission.payload;
  const str = (key: string): string | undefined =>
    typeof p[key] === 'string' && (p[key] as string).trim() ? (p[key] as string) : undefined;

  const title =
    str('organizationName') ?? str('name') ?? str('email') ?? 'Anonymous submission';
  const detail =
    str('subject') ??
    str('partnershipInterest') ??
    str('expertise') ??
    str('email') ??
    str('message') ??
    '';
  return { title, detail };
};

/** A single tappable row in the recent-submissions feed. */
const SubmissionRow = ({ submission }: { submission: Submission }): JSX.Element => {
  const meta = SUBMISSION_META[submission.type];
  const { title, detail } = describeSubmission(submission);
  const Icon = meta.icon;
  const isNew = submission.status === 'new';
  return (
    <CardActionArea
      component={RouterLink}
      to="/submissions"
      sx={{
        px: 2.5,
        py: 1.75,
        transition: (t) => t.transitions.create('background-color'),
        '&:hover': { bgcolor: alpha(meta.color, 0.05) },
        '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
      }}
    >
      <Stack direction="row" spacing={1.75} alignItems="center">
        <Avatar
          variant="rounded"
          sx={{
            bgcolor: alpha(meta.color, 0.12),
            color: 'text.secondary',
            width: 42,
            height: 42,
            borderRadius: 2.5,
            boxShadow: `inset 0 0 0 1px ${alpha(meta.color, 0.16)}`,
          }}
        >
          <Icon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {title}
            </Typography>
            <Chip
              label={meta.label}
              size="small"
              sx={{
                height: 19,
                fontSize: 10.5,
                letterSpacing: 0.3,
                fontWeight: 700,
                textTransform: 'uppercase',
                bgcolor: alpha(meta.color, 0.12),
                color: 'text.secondary',
                '& .MuiChip-label': { px: 0.9 },
              }}
            />
          </Stack>
          {detail && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {detail}
            </Typography>
          )}
        </Box>
        <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}
          >
            {relativeTime(submission.createdAt)}
          </Typography>
          {isNew ? (
            <Box
              aria-label="new"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 0.75,
                height: 18,
                borderRadius: 999,
                bgcolor: 'secondary.main',
                color: 'secondary.contrastText',
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}
            >
              New
            </Box>
          ) : (
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} aria-hidden />
          )}
        </Stack>
      </Stack>
    </CardActionArea>
  );
};

/** Recent-submissions feed body: handles loading, empty and populated states. */
const RecentSubmissions = ({
  loading,
  items,
}: {
  loading: boolean;
  items: Submission[];
}): JSX.Element => {
  if (loading) {
    return (
      <Box sx={{ p: 2.5 }}>
        <CardListSkeleton count={4} />
      </Box>
    );
  }
  if (items.length === 0) {
    return (
      <Stack alignItems="center" spacing={1.25} sx={{ py: 7, px: 3, textAlign: 'center' }}>
        <Avatar
          variant="rounded"
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            bgcolor: 'action.hover',
            color: 'text.disabled',
          }}
        >
          <InboxIcon />
        </Avatar>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          No submissions yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
          Inbound contact, partner, volunteer, and job requests will appear here.
        </Typography>
      </Stack>
    );
  }
  return (
    <Stack divider={<Divider sx={{ borderColor: 'divider', opacity: 0.7 }} />}>
      {items.map((submission) => (
        <SubmissionRow key={submission.id} submission={submission} />
      ))}
    </Stack>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  caption: string;
  icon: SvgIconComponent;
  to: string;
  accent: string;
  loading: boolean;
}

const StatCard = ({
  label,
  value,
  caption,
  icon: Icon,
  to,
  accent,
  loading,
}: StatCardProps): JSX.Element => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      borderRadius: 3,
      position: 'relative',
      overflow: 'hidden',
      borderColor: 'divider',
      transition: (t) =>
        t.transitions.create(['box-shadow', 'border-color', 'transform'], {
          duration: t.transitions.duration.shorter,
        }),
      // Soft radial accent wash, top-right corner.
      '&::after': {
        content: '""',
        position: 'absolute',
        top: -48,
        insetInlineEnd: -48,
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${alpha(accent, 0.14)} 0%, ${alpha(accent, 0)} 70%)`,
        pointerEvents: 'none',
      },
      // Accent left-bar, grows on hover.
      '&::before': {
        content: '""',
        position: 'absolute',
        insetInlineStart: 0,
        top: 0,
        bottom: 0,
        width: 4,
        bgcolor: accent,
        transition: (t) => t.transitions.create('width'),
        zIndex: 1,
      },
      '&:hover': {
        borderColor: alpha(accent, 0.45),
        boxShadow: `0 14px 30px -16px ${alpha(accent, 0.55)}`,
        transform: 'translateY(-3px)',
      },
      '&:hover::before': { width: 6 },
    }}
  >
    <CardActionArea
      component={RouterLink}
      to={to}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
      }}
    >
      <CardContent sx={{ flexGrow: 1, width: '100%', p: 2.75 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: alpha(accent, 0.12),
              color: 'text.primary',
              width: 46,
              height: 46,
              borderRadius: 2.5,
              boxShadow: `inset 0 0 0 1px ${alpha(accent, 0.18)}`,
            }}
          >
            <Icon fontSize="small" />
          </Avatar>
          <Box
            aria-hidden
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              color: 'text.disabled',
              transition: (t) =>
                t.transitions.create(['color', 'background-color', 'transform']),
              '.MuiCardActionArea-root:hover &': {
                color: 'text.primary',
                bgcolor: alpha(accent, 0.12),
                transform: 'translate(2px, -2px)',
              },
            }}
          >
            <ArrowOutwardIcon sx={{ fontSize: 17 }} />
          </Box>
        </Stack>
        <Typography
          variant="h3"
          sx={{
            mt: 2.25,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            color: loading ? 'text.disabled' : 'text.primary',
          }}
        >
          {loading ? '—' : value}
        </Typography>
        <Typography
          variant="overline"
          sx={{
            display: 'block',
            mt: 0.75,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'text.secondary',
          }}
        >
          {label}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
          <Box
            aria-hidden
            sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: accent, flexShrink: 0 }}
          />
          <Typography variant="caption" color="text.secondary" noWrap>
            {caption}
          </Typography>
        </Stack>
      </CardContent>
    </CardActionArea>
  </Card>
);

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

const Panel = ({ title, subtitle, action, children }: PanelProps): JSX.Element => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      borderRadius: 3,
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ px: 2.75, py: 2 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
    <Divider sx={{ borderColor: 'divider' }} />
    <Box sx={{ flexGrow: 1 }}>{children}</Box>
  </Card>
);

/** Build the fourth, role-dependent stat card (team members for admins, content otherwise). */
const buildRoleStat = (isAdmin: boolean, users: ReturnType<typeof useUsers>): StatCardProps => {
  if (isAdmin) {
    return {
      label: 'Team members',
      value: String(users.data?.length ?? 0),
      caption: 'Console accounts',
      icon: GroupsIcon,
      to: '/users',
      accent: brandColors.mint,
      loading: users.isLoading,
    };
  }
  return {
    label: 'Content types',
    value: String(RESOURCES.length),
    caption: 'Collections to manage',
    icon: PersonOutlineIcon,
    to: `/content/${RESOURCES[0]?.key ?? ''}`,
    accent: brandColors.mint,
    loading: false,
  };
};

interface Queries {
  newSubmissions: ReturnType<typeof useSubmissions>;
  recentSubmissions: ReturnType<typeof useSubmissions>;
  subscribers: ReturnType<typeof useSubscribers>;
  donations: ReturnType<typeof useDonations>;
  users: ReturnType<typeof useUsers>;
}

/** Sum of succeeded donations (USD) plus the succeeded/total caption. */
const summarizeDonations = (
  donations: ReturnType<typeof useDonations>,
): { value: string; caption: string } => {
  const items = donations.data?.items ?? [];
  let raised = 0;
  let succeeded = 0;
  for (const d of items) {
    if (d.status === DonationStatus.Succeeded) {
      raised += d.amountUsd;
      succeeded += 1;
    }
  }
  return {
    value: usd.format(raised),
    caption: `${succeeded} of ${donations.data?.total ?? 0} succeeded`,
  };
};

const buildStats = (isAdmin: boolean, q: Queries): StatCardProps[] => {
  const newCount = q.newSubmissions.data?.total ?? 0;
  const donationSummary = summarizeDonations(q.donations);
  return [
    {
      label: 'New submissions',
      value: String(newCount),
      caption: newCount > 0 ? 'Awaiting review' : 'All caught up',
      icon: InboxIcon,
      to: '/submissions',
      accent: brandColors.forestGreen,
      loading: q.newSubmissions.isLoading,
    },
    {
      label: 'Subscribers',
      value: String(q.subscribers.data?.total ?? 0),
      caption: 'Newsletter audience',
      icon: MailOutlineIcon,
      to: '/subscribers',
      accent: brandColors.mint,
      loading: q.subscribers.isLoading,
    },
    {
      label: 'Donations raised',
      value: donationSummary.value,
      caption: donationSummary.caption,
      icon: VolunteerActivismIcon,
      to: '/donations',
      accent: brandColors.gold,
      loading: q.donations.isLoading,
    },
    buildRoleStat(isAdmin, q.users),
  ];
};

const sortRecent = (items: Submission[] | undefined): Submission[] =>
  [...(items ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

/** A compact content quick-tile — first-letter medallion + label + edit hint. */
const ContentTile = ({
  resourceKey,
  label,
  singular,
}: {
  resourceKey: string;
  label: string;
  singular: string;
}): JSX.Element => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      borderRadius: 2.5,
      borderColor: 'divider',
      transition: (t) =>
        t.transitions.create(['border-color', 'background-color', 'box-shadow']),
      '&:hover': {
        borderColor: alpha(brandColors.forestGreen, 0.4),
        bgcolor: alpha(brandColors.forestGreen, 0.04),
        boxShadow: `0 8px 18px -14px ${alpha(brandColors.forestGreen, 0.6)}`,
      },
    }}
  >
    <CardActionArea
      component={RouterLink}
      to={`/content/${resourceKey}`}
      sx={{
        height: '100%',
        p: 1.75,
        '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ overflow: 'hidden' }}>
        <Avatar
          variant="rounded"
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: alpha(brandColors.forestGreen, 0.1),
            color: 'text.primary',
            fontSize: 15,
            fontWeight: 800,
            boxShadow: `inset 0 0 0 1px ${alpha(brandColors.forestGreen, 0.16)}`,
          }}
        >
          {label.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Edit {singular.toLowerCase()}
          </Typography>
        </Box>
        <ChevronRightIcon
          fontSize="small"
          aria-hidden
          sx={{
            color: 'text.disabled',
            flexShrink: 0,
            transition: (t) => t.transitions.create(['color', 'transform']),
            '.MuiCardActionArea-root:hover &': {
              color: 'text.primary',
              transform: 'translateX(2px)',
            },
          }}
        />
      </Stack>
    </CardActionArea>
  </Card>
);

const Dashboard = (): JSX.Element => {
  const { user } = useAuth();
  const queries: Queries = {
    newSubmissions: useSubmissions({ status: 'new' }),
    recentSubmissions: useSubmissions({}),
    subscribers: useSubscribers(),
    donations: useDonations(),
    users: useUsers(),
  };

  const firstName = user?.name.split(' ')[0] ?? 'there';
  const newCount = queries.newSubmissions.data?.total ?? 0;
  const subtitle =
    newCount > 0
      ? `You have ${newCount} new submission${newCount === 1 ? '' : 's'} waiting for review.`
      : 'Inbox is clear. Keep the Impact Africa Alliance site fresh and current.';
  const stats = buildStats(user?.role === 'admin', queries);
  const recent = sortRecent(queries.recentSubmissions.data?.items);

  return (
    <>
      <PageHeader
        icon={<DashboardIcon />}
        title="Dashboard"
        description={`Welcome back, ${firstName}. ${subtitle}`}
        help={pageGuides.Dashboard}
        action={
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}
          >
            <Button
              component={RouterLink}
              to="/submissions"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{ borderRadius: 2.5, px: 2.5, fontWeight: 600, width: { xs: '100%', sm: 'auto' } }}
            >
              Review submissions
            </Button>
            <Button
              component={RouterLink}
              to="/subscribers"
              variant="outlined"
              startIcon={<MailOutlineIcon />}
              sx={{ borderRadius: 2.5, px: 2.5, width: { xs: '100%', sm: 'auto' } }}
            >
              Newsletter
            </Button>
          </Stack>
        }
      />
      <Stack spacing={3.5}>
        {/* KPI stat cards — equal height */}
        <Grid id="admin-dashboard-stats" container spacing={2.5}>
          {stats.map((stat) => (
            <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        {/* Two-column working area */}
        <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Panel
              title="Recent submissions"
              subtitle="Latest inbound activity"
              action={
                <Button
                  component={RouterLink}
                  to="/submissions"
                  size="small"
                  endIcon={<ChevronRightIcon />}
                  sx={{ fontWeight: 600 }}
                >
                  View all
                </Button>
              }
            >
              <RecentSubmissions loading={queries.recentSubmissions.isLoading} items={recent} />
            </Panel>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Panel title="Manage content" subtitle="Jump into a collection">
              <Grid container spacing={1.5} sx={{ p: 2.5 }}>
                {RESOURCES.map((resource) => (
                  <Grid key={resource.key} size={{ xs: 12, sm: 6 }}>
                    <ContentTile
                      resourceKey={resource.key}
                      label={resource.label}
                      singular={resource.singular}
                    />
                  </Grid>
                ))}
              </Grid>
            </Panel>
          </Grid>
        </Grid>
      </Stack>
    </>
  );
};

export default Dashboard;
