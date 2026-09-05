import {
  brandColors,
  SubmissionType,
  type DashboardSummary,
  type PaymentProviderStatus,
  type Submission,
} from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupsIcon from '@mui/icons-material/Groups';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MailOutlineIcon from '@mui/icons-material/MailOutlineOutlined';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import ShareIcon from '@mui/icons-material/Share';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { CardListSkeleton } from '../components/CardListSkeleton';
import { BarChart } from '../components/charts/BarChart';
import { DonationChartEmpty } from '../components/charts/DonationChartEmpty';
import { DonutChart } from '../components/charts/DonutChart';
import { NewSubmissionsBanner } from '../components/NewSubmissionsBanner';
import { PageHeader } from '../components/PageHeader';
import {
  useDashboardSummary,
  useSubmissions,
  useUpdatePaymentSettings,
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

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** `2026-07` → `Jul` for chart axis labels. */
const monthShortLabel = (bucket: string): string => {
  const [year, month] = bucket.split('-').map(Number);
  if (!year || !month) {
    return bucket;
  }
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
};

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
const describeSubmission = (submission: Submission): { title: string; detail: string } => {
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
              transition: (t) => t.transitions.create(['color', 'background-color', 'transform']),
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
      transition: (t) => t.transitions.create(['border-color', 'background-color', 'box-shadow']),
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

// ── Payment providers ───────────────────────────────────────────────────────

type ProviderKey = 'stripe' | 'paystack';

const PROVIDER_META: Record<ProviderKey, { label: string; envHint: string }> = {
  stripe: { label: 'Stripe', envHint: 'STRIPE_SECRET_KEY' },
  paystack: { label: 'Paystack', envHint: 'PAYSTACK_SECRET_KEY' },
};

const providerStatusChip = (status: PaymentProviderStatus): JSX.Element => {
  if (status.accepting) {
    return <Chip label="Accepting donations" color="success" size="small" />;
  }
  if (status.configured) {
    return <Chip label="Disabled" color="warning" size="small" />;
  }
  return <Chip label="Not configured" size="small" variant="outlined" />;
};

const providerSwitchTooltip = (status: PaymentProviderStatus, isAdmin: boolean, envHint: string): string => {
  if (!isAdmin) {
    return 'Only admins can change payment settings';
  }
  if (!status.configured) {
    return `Add ${envHint} to the API environment first`;
  }
  return '';
};

const providerHelperText = (status: PaymentProviderStatus, envHint: string): string => {
  if (!status.configured) {
    return `Add ${envHint} to the API environment`;
  }
  if (status.webhookConfigured) {
    return 'API key and webhook secret configured';
  }
  return 'API key configured · webhook secret missing';
};

const ProviderRow = ({
  providerKey,
  status,
  isAdmin,
  disabled,
  onToggle,
}: {
  providerKey: ProviderKey;
  status: PaymentProviderStatus;
  isAdmin: boolean;
  disabled: boolean;
  onToggle: (providerKey: ProviderKey, enabled: boolean) => void;
}): JSX.Element => {
  const meta = PROVIDER_META[providerKey];
  const switchDisabled = disabled || !status.configured || !isAdmin;

  return (
    <Stack
      direction="row"
      spacing={1.75}
      alignItems="center"
      sx={{
        p: 1.75,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: status.accepting ? alpha(brandColors.forestGreen, 0.04) : 'transparent',
      }}
    >
      <Avatar
        variant="rounded"
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: alpha(brandColors.forestGreen, 0.1),
          color: 'text.primary',
          boxShadow: `inset 0 0 0 1px ${alpha(brandColors.forestGreen, 0.16)}`,
        }}
      >
        <CreditCardIcon fontSize="small" />
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {meta.label}
          </Typography>
          {providerStatusChip(status)}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap>
          {providerHelperText(status, meta.envHint)}
        </Typography>
      </Box>
      <Tooltip title={providerSwitchTooltip(status, isAdmin, meta.envHint)} placement="top" arrow>
        <span>
          <Switch
            checked={status.enabled}
            disabled={switchDisabled}
            onChange={(event) => onToggle(providerKey, event.target.checked)}
            slotProps={{ input: { 'aria-label': `Enable ${meta.label}` } }}
          />
        </span>
      </Tooltip>
    </Stack>
  );
};

const PaymentProvidersPanel = ({
  payments,
  isAdmin,
  loading,
  onFeedback,
}: {
  payments?: DashboardSummary['payments'];
  isAdmin: boolean;
  loading: boolean;
  onFeedback: (message: string, severity: 'success' | 'error') => void;
}): JSX.Element => {
  const update = useUpdatePaymentSettings();

  const handleToggle = (providerKey: ProviderKey, enabled: boolean): void => {
    const input =
      providerKey === 'stripe' ? { stripeEnabled: enabled } : { paystackEnabled: enabled };
    update.mutate(input, {
      onSuccess: () =>
        onFeedback(
          `${PROVIDER_META[providerKey].label} ${enabled ? 'enabled — donations can now be taken' : 'disabled'}`,
          'success',
        ),
      onError: (error) => onFeedback(error.message, 'error'),
    });
  };

  return (
    <Panel
      title="Payment providers"
      subtitle="Enable or disable donation gateways"
    >
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        {loading || !payments ? (
          <>
            <Skeleton variant="rounded" height={76} />
            <Skeleton variant="rounded" height={76} />
          </>
        ) : (
          (['stripe', 'paystack'] as ProviderKey[]).map((providerKey) => (
            <ProviderRow
              key={providerKey}
              providerKey={providerKey}
              status={payments[providerKey]}
              isAdmin={isAdmin}
              disabled={update.isPending}
              onToggle={handleToggle}
            />
          ))
        )}
        <Typography variant="caption" color="text.secondary">
          A provider only accepts donations when it is enabled here AND its API keys are set in
          the API environment. Webhooks keep working for donations already in flight.
        </Typography>
      </Stack>
    </Panel>
  );
};

// ── Donations visualization ─────────────────────────────────────────────────

const ProviderSplitBar = ({
  label,
  amount,
  share,
  color,
}: {
  label: string;
  amount: number;
  share: number;
  color: string;
}): JSX.Element => (
  <Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {usd.format(amount)}
      </Typography>
    </Stack>
    <Box sx={{ height: 6, borderRadius: 99, bgcolor: alpha(color, 0.14), overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${Math.round(share * 100)}%`, borderRadius: 99, bgcolor: color }} />
    </Box>
  </Box>
);

const DonationsPanel = ({
  donations,
  loading,
}: {
  donations?: DashboardSummary['donations'];
  loading: boolean;
}): JSX.Element => (
  <Panel
    title="Donations"
    subtitle="Completed gifts · last 6 months"
    action={
      <Button
        component={RouterLink}
        to="/donations"
        size="small"
        endIcon={<ChevronRightIcon />}
        sx={{ fontWeight: 600 }}
      >
        View all
      </Button>
    }
  >
    {loading || !donations ? (
      <Box sx={{ p: 2.5 }}>
        <Skeleton variant="text" width={160} height={44} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 1.5 }} />
      </Box>
    ) : (
      <Box sx={{ p: 2.5 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              {usd.format(donations.totalRaisedUsd)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total raised · {donations.succeededCount} completed
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip size="small" variant="outlined" label={`${donations.pendingCount} pending`} />
            <Chip
              size="small"
              variant="outlined"
              color={donations.failedCount > 0 ? 'error' : 'default'}
              label={`${donations.failedCount} failed`}
            />
          </Stack>
        </Stack>

        {donations.monthly.some((bucket) => bucket.amountUsd > 0) ? (
          <BarChart
            data={donations.monthly.map((bucket) => ({
              label: bucket.month,
              value: bucket.amountUsd,
              displayValue: bucket.amountUsd > 0 ? usdCompact.format(bucket.amountUsd) : undefined,
            }))}
            color={brandColors.gold}
            formatLabel={monthShortLabel}
            formatValue={(value) => usdCompact.format(value)}
          />
        ) : (
          <DonationChartEmpty
            hasHistory={donations.succeededCount > 0}
            needsReview={donations.pendingCount > 0 || donations.failedCount > 0}
          />
        )}

        <Divider sx={{ my: 2 }} />
        <Stack spacing={1.25}>
          <ProviderSplitBar
            label="Stripe"
            amount={donations.byProvider.stripe}
            share={
              donations.totalRaisedUsd > 0
                ? donations.byProvider.stripe / donations.totalRaisedUsd
                : 0
            }
            color={brandColors.forestGreen}
          />
          <ProviderSplitBar
            label="Paystack"
            amount={donations.byProvider.paystack}
            share={
              donations.totalRaisedUsd > 0
                ? donations.byProvider.paystack / donations.totalRaisedUsd
                : 0
            }
            color={brandColors.mint}
          />
        </Stack>
      </Box>
    )}
  </Panel>
);

// ── Submissions breakdown ───────────────────────────────────────────────────

const SUBMISSION_TYPE_ORDER: Submission['type'][] = [
  SubmissionType.Contact,
  SubmissionType.Partner,
  SubmissionType.Volunteer,
  SubmissionType.Job,
];

const SubmissionsBreakdownPanel = ({
  submissions,
  loading,
}: {
  submissions?: DashboardSummary['submissions'];
  loading: boolean;
}): JSX.Element => {
  const countOf = (key: string): number =>
    submissions?.byType.find((entry) => entry.key === key)?.count ?? 0;
  const statusCount = (key: string): number =>
    submissions?.byStatus.find((entry) => entry.key === key)?.count ?? 0;

  return (
    <Panel
      title="Submissions"
      subtitle="Inbound forms by type and status"
      action={
        <Button
          component={RouterLink}
          to="/submissions"
          size="small"
          endIcon={<ChevronRightIcon />}
          sx={{ fontWeight: 600 }}
        >
          Review
        </Button>
      }
    >
      {loading || !submissions ? (
        <Box sx={{ p: 2.5 }}>
          <Skeleton variant="circular" width={168} height={168} sx={{ mx: 'auto' }} />
        </Box>
      ) : (
        <Box sx={{ p: 2.5 }}>
          <DonutChart
            data={SUBMISSION_TYPE_ORDER.map((type) => ({
              label: SUBMISSION_META[type].label,
              value: countOf(type),
              color: SUBMISSION_META[type].color,
            }))}
            centerLabel="total"
            emptyMessage="No submissions"
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
            <Chip size="small" color="secondary" label={`${statusCount('new')} new`} />
            <Chip size="small" variant="outlined" label={`${statusCount('read')} read`} />
            <Chip size="small" variant="outlined" label={`${statusCount('archived')} archived`} />
          </Stack>
        </Box>
      )}
    </Panel>
  );
};

// ── Content inventory ───────────────────────────────────────────────────────

const ContentInventoryPanel = ({
  content,
  loading,
}: {
  content?: DashboardSummary['content'];
  loading: boolean;
}): JSX.Element => (
  <Panel
    title="Content inventory"
    subtitle="Live vs total across collections"
    action={
      <Button
        component={RouterLink}
        to={`/content/${RESOURCES[0]?.key ?? 'articles'}`}
        size="small"
        endIcon={<ChevronRightIcon />}
        sx={{ fontWeight: 600 }}
      >
        Manage
      </Button>
    }
  >
    <Grid container spacing={1.5} sx={{ p: 2.5 }}>
      {(loading || !content ? Array.from({ length: 4 }) : content).map((entry, index) => (
        <Grid key={entry ? (entry as DashboardSummary['content'][number]).key : index} size={{ xs: 12, sm: 6 }}>
          {!entry ? (
            <Skeleton variant="rounded" height={66} />
          ) : (
            <ContentInventoryRow entry={entry as DashboardSummary['content'][number]} />
          )}
        </Grid>
      ))}
    </Grid>
  </Panel>
);

const ContentInventoryRow = ({
  entry,
}: {
  entry: DashboardSummary['content'][number];
}): JSX.Element => {
  const ratio = entry.total > 0 ? entry.published / entry.total : 0;
  return (
    <CardActionArea
      component={RouterLink}
      to={`/content/${entry.key}`}
      sx={{
        display: 'block',
        p: 1.75,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        transition: (t) => t.transitions.create(['border-color', 'background-color']),
        '&:hover': {
          borderColor: alpha(brandColors.forestGreen, 0.4),
          bgcolor: alpha(brandColors.forestGreen, 0.04),
        },
        '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {entry.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {entry.published} live · {entry.total} total
        </Typography>
      </Stack>
      <Box
        sx={{
          height: 6,
          borderRadius: 99,
          bgcolor: alpha(brandColors.forestGreen, 0.14),
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${Math.round(ratio * 100)}%`,
            borderRadius: 99,
            bgcolor: brandColors.forestGreen,
          }}
        />
      </Box>
    </CardActionArea>
  );
};

// ── System snapshot ─────────────────────────────────────────────────────────

const SystemRow = ({
  icon: Icon,
  label,
  value,
  to,
  accent,
}: {
  icon: SvgIconComponent;
  label: string;
  value: string;
  to: string;
  accent: string;
}): JSX.Element => (
  <CardActionArea
    component={RouterLink}
    to={to}
    sx={{
      px: 1.5,
      py: 1.25,
      borderRadius: 2,
      '&:hover': { bgcolor: alpha(accent, 0.05) },
      '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar
        variant="rounded"
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          bgcolor: alpha(accent, 0.12),
          color: 'text.secondary',
          boxShadow: `inset 0 0 0 1px ${alpha(accent, 0.16)}`,
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Avatar>
      <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }} noWrap>
        {label}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Stack>
  </CardActionArea>
);

const SystemPanel = ({
  summary,
  loading,
}: {
  summary?: DashboardSummary;
  loading: boolean;
}): JSX.Element => (
  <Panel title="Operations snapshot" subtitle="Across the whole console">
    {loading || !summary ? (
      <Box sx={{ p: 2 }}>
        <CardListSkeleton count={3} />
      </Box>
    ) : (
      <Stack sx={{ p: 1 }}>
        <SystemRow
          icon={CalendarMonthIcon}
          label="Upcoming events"
          value={`${summary.events.upcoming} / ${summary.events.total}`}
          to="/events"
          accent={brandColors.forestGreen}
        />
        <SystemRow
          icon={PrivacyTipIcon}
          label="Open privacy requests"
          value={String(summary.privacyRequests.open)}
          to="/privacy-requests"
          accent={brandColors.gold}
        />
        <SystemRow
          icon={ShareIcon}
          label="Social accounts connected"
          value={String(summary.socialConnections)}
          to="/social-connections"
          accent={brandColors.mint}
        />
        <SystemRow
          icon={AutoStoriesIcon}
          label="Content collections live"
          value={`${summary.content.reduce((sum, entry) => sum + entry.published, 0)} items`}
          to={`/content/${RESOURCES[0]?.key ?? 'articles'}`}
          accent={brandColors.deepForest}
        />
      </Stack>
    )}
  </Panel>
);

// ── Page ────────────────────────────────────────────────────────────────────

const sortRecent = (items: Submission[] | undefined): Submission[] =>
  [...(items ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

const buildSubtitle = (newCount: number): string => {
  if (newCount > 0) {
    return `You have ${newCount} new submission${newCount === 1 ? '' : 's'} waiting for review.`;
  }
  return 'Inbox is clear. Keep the Impact Africa Alliance site fresh and current.';
};

const buildRoleStat = (isAdmin: boolean, data: DashboardSummary | undefined, loading: boolean): StatCardProps => {
  if (isAdmin) {
    return {
      label: 'Team members',
      value: String(data?.users ?? 0),
      caption: 'Console accounts',
      icon: GroupsIcon,
      to: '/users',
      accent: brandColors.deepForest,
      loading,
    };
  }
  return {
    label: 'Content types',
    value: String(RESOURCES.length),
    caption: 'Collections to manage',
    icon: PersonOutlineIcon,
    to: `/content/${RESOURCES[0]?.key ?? ''}`,
    accent: brandColors.deepForest,
    loading: false,
  };
};

const buildStats = (
  isAdmin: boolean,
  data: DashboardSummary | undefined,
  loading: boolean,
): StatCardProps[] => [
  {
    label: 'New submissions',
    value: String(data?.submissions.newCount ?? 0),
    caption: (data?.submissions.newCount ?? 0) > 0 ? 'Awaiting review' : 'All caught up',
    icon: InboxIcon,
    to: '/submissions',
    accent: brandColors.forestGreen,
    loading,
  },
  {
    label: 'Subscribers',
    value: String(data?.subscribers.total ?? 0),
    caption: `+${data?.subscribers.newLast30Days ?? 0} in the last 30 days`,
    icon: MailOutlineIcon,
    to: '/subscribers',
    accent: brandColors.mint,
    loading,
  },
  {
    label: 'Donations raised',
    value: usd.format(data?.donations.totalRaisedUsd ?? 0),
    caption: `${data?.donations.succeededCount ?? 0} succeeded gifts`,
    icon: VolunteerActivismIcon,
    to: '/donations',
    accent: brandColors.gold,
    loading,
  },
  buildRoleStat(isAdmin, data, loading),
];

const HeaderActions = (): JSX.Element => (
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
);

const ManageContentPanel = (): JSX.Element => (
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
);

interface DashboardBodyProps {
  data: DashboardSummary | undefined;
  loading: boolean;
  isAdmin: boolean;
  recent: Submission[];
  recentLoading: boolean;
  onFeedback: (message: string, severity: 'success' | 'error') => void;
}

const DashboardBody = ({
  data,
  loading,
  isAdmin,
  recent,
  recentLoading,
  onFeedback,
}: DashboardBodyProps): JSX.Element => (
  <Stack spacing={3.5}>
    {/* KPI stat cards */}
    <Grid id="admin-dashboard-stats" container spacing={2.5}>
      {buildStats(isAdmin, data, loading).map((stat) => (
        <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard {...stat} />
        </Grid>
      ))}
    </Grid>

    {/* Donations — full width */}
    <DonationsPanel donations={data?.donations} loading={loading} />

    {/* Payment providers + operations snapshot, side by side */}
    <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <PaymentProvidersPanel
          payments={data?.payments}
          isAdmin={isAdmin}
          loading={loading}
          onFeedback={onFeedback}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SystemPanel summary={data} loading={loading} />
      </Grid>
    </Grid>

    {/* Submissions breakdown + content inventory */}
    <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
      <Grid size={{ xs: 12, md: 5 }}>
        <SubmissionsBreakdownPanel submissions={data?.submissions} loading={loading} />
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <ContentInventoryPanel content={data?.content} loading={loading} />
      </Grid>
    </Grid>

    {/* Recent activity + content quick links */}
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
          <RecentSubmissions loading={recentLoading} items={recent} />
        </Panel>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <ManageContentPanel />
      </Grid>
    </Grid>
  </Stack>
);

const Dashboard = (): JSX.Element => {
  const { user } = useAuth();
  const summary = useDashboardSummary();
  const recentSubmissions = useSubmissions({});
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <>
      <PageHeader
        icon={<DashboardIcon />}
        title="Dashboard"
        description={`Welcome back, ${firstName}. ${buildSubtitle(summary.data?.submissions.newCount ?? 0)}`}
        help={pageGuides.Dashboard}
        action={<HeaderActions />}
      />

      <NewSubmissionsBanner />

      {summary.isError && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          Couldn&apos;t load the dashboard overview — {summary.error.message}
        </Alert>
      )}

      <DashboardBody
        data={summary.data}
        loading={summary.isLoading}
        isAdmin={user?.role === 'admin'}
        recent={sortRecent(recentSubmissions.data?.items)}
        recentLoading={recentSubmissions.isLoading}
        onFeedback={(message, severity) => setSnackbar({ message, severity })}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.severity ?? 'success'}
          variant="filled"
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Dashboard;
