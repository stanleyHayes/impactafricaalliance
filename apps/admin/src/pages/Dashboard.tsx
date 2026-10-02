import {
  brandColors,
  DASHBOARD_CONTENT_COLLECTIONS,
  DONATION_CURRENCIES,
  DONATION_CURRENCY_RULES,
  formatMoney,
  SubmissionType,
  type DashboardDonationMonth,
  type DashboardProviderDonations,
  type DashboardSummary,
  type DonationCurrency,
  type MoneyAmount,
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
import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { useMayOpen } from '../auth/may-open';
import { RequirePermission } from '../auth/RequirePermission';
import { BarChart } from '../components/charts/BarChart';
import { DonationChartEmpty } from '../components/charts/DonationChartEmpty';
import { DonutChart } from '../components/charts/DonutChart';
import { YourWorkPanel } from '../components/dashboard/YourWorkPanel';
import { DotList } from '../components/DotList';
import { NewSubmissionsBanner } from '../components/NewSubmissionsBanner';
import { PageHeader } from '../components/PageHeader';
import { useDashboardSummary, useSubmissions, useUpdatePaymentSettings } from '../lib/admin-hooks';
import { formatUtcShort } from '../lib/date';
import { fittedFontSize, readDonationsSummary, zeroCurrencies } from '../lib/donations';
import { pageGuides } from '../lib/page-guides';
import { RESOURCES } from '../resources/registry';
import { skinned, surfaceSx, tokenVar } from '../theme/surfaces';

/**
 * What has been raised, one figure per currency ("GH₵4,250", "$1,200"): there is
 * no rate to add cedis to dollars at, so they are never summed. Before the first
 * gift, a zero in each currency gifts are taken in ("GH₵0"), so it reads as money.
 */
const raisedFigures = (
  raised: readonly MoneyAmount[],
  zero: readonly DonationCurrency[],
  options: { whole?: boolean } = {},
): string[] =>
  raised.length > 0
    ? raised.map((entry) => formatMoney(entry.amount, entry.currency, options))
    : zero.map((currency) => formatMoney(0, currency));

/** The amount in one currency from a per-currency list; 0 when it has none. */
const amountIn = (raised: readonly MoneyAmount[], currency: DonationCurrency): number =>
  raised.find((entry) => entry.currency === currency)?.amount ?? 0;

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
  [SubmissionType.Contact]: {
    label: 'Contact',
    icon: MailOutlineIcon,
    color: brandColors.forestGreen,
  },
  [SubmissionType.Partner]: { label: 'Partner', icon: HandshakeIcon, color: brandColors.gold },
  [SubmissionType.Volunteer]: {
    label: 'Volunteer',
    icon: VolunteerActivismIcon,
    color: brandColors.mint,
  },
  [SubmissionType.Job]: {
    label: 'Job',
    icon: WorkOutlineOutlinedIcon,
    color: brandColors.deepForest,
  },
};

/** Pull a human label + supporting line from an untyped submission payload, defensively. */
const describeSubmission = (submission: Submission): { title: string; detail: string } => {
  const p = submission.payload;
  const str = (key: string): string | undefined =>
    typeof p[key] === 'string' && (p[key] as string).trim() ? (p[key] as string) : undefined;

  const title = str('organizationName') ?? str('name') ?? str('email') ?? 'Anonymous submission';
  const detail =
    str('subject') ??
    str('partnershipInterest') ??
    str('expertise') ??
    str('email') ??
    str('message') ??
    '';
  return { title, detail };
};

/**
 * An icon tile tinted in its own tone, with a hairline ring of the same tone.
 *
 * The tone says which kind of thing the row is (a partner, a donation, a
 * gateway), so every skin keeps the tint. What a skin changes is the ring: it
 * becomes that skin's tile depth, raised, frosted or clay, which is what makes
 * the tile read as part of the skin rather than a flat sticker on it. Classic
 * keeps exactly the tint and ring it always had.
 */
const toneTileSx = (tone: string, fill: number, ring: number) =>
  skinned(
    { bgcolor: alpha(tone, fill), boxShadow: `inset 0 0 0 1px ${alpha(tone, ring)}` },
    { boxShadow: tokenVar('tileShadow') },
  );

/**
 * A row in a list inside a panel, tinted in its tone under the pointer.
 *
 * In Classic the row only takes a faint wash of its tone. A skin uses its own
 * list-item hover instead (the row lifts in Neumorphism and Clay, brightens in
 * Glass), the same hover every menu and list in that skin has.
 */
const toneRowHoverSx = (tone: string) =>
  skinned(
    { '&:hover': { bgcolor: alpha(tone, 0.05) } },
    { '&:hover': { bgcolor: tokenVar('itemHoverBg'), boxShadow: tokenVar('itemHoverShadow') } },
  );

/**
 * A thin bar track in the bar's own tone. A skin sinks it into the panel the
 * way it sinks its progress bars, so the filled part reads as sitting in a
 * groove; the tone stays, since it is the colour of the data.
 */
const toneTrackSx = (tone: string) =>
  skinned({ bgcolor: alpha(tone, 0.14) }, { boxShadow: tokenVar('surfaceInsetShadow') });

/** How many recent submissions the panel shows, and so how many it draws while loading. */
const RECENT_SUBMISSION_LIMIT = 5;

/**
 * The loading shape of a SubmissionRow.
 *
 * It repeats that row's own padding and avatar size rather than picking a
 * height, so the two cannot drift apart and the panel is the same height
 * before and after the data arrives.
 */
const SubmissionRowSkeleton = (): JSX.Element => (
  <Box sx={{ px: 2.5, py: 1.75 }}>
    <Stack direction="row" spacing={1.75} alignItems="center">
      <Skeleton
        variant="rounded"
        width={42}
        height={42}
        sx={{ borderRadius: 2.5, flexShrink: 0 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton variant="text" width="45%" sx={{ fontSize: '0.875rem' }} />
        <Skeleton variant="text" width="70%" sx={{ fontSize: '0.75rem' }} />
      </Box>
    </Stack>
  </Box>
);

const SubmissionRow = ({ submission }: { submission: Submission }): JSX.Element => {
  const meta = SUBMISSION_META[submission.type];
  const { title, detail } = describeSubmission(submission);
  const Icon = meta.icon;
  const isNew = submission.status === 'new';
  return (
    <CardActionArea
      component={RouterLink}
      to="/submissions"
      sx={[
        {
          px: 2.5,
          py: 1.75,
          transition: (t) => t.transitions.create('background-color'),
          '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
        },
        toneRowHoverSx(meta.color),
      ]}
    >
      <Stack direction="row" spacing={1.75} alignItems="center">
        <Avatar
          variant="rounded"
          sx={[
            { color: 'text.secondary', width: 42, height: 42, borderRadius: 2.5 },
            toneTileSx(meta.color, 0.12, 0.16),
          ]}
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
              sx={[
                {
                  height: 19,
                  fontSize: 10.5,
                  letterSpacing: 0.3,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  // On the filled class, or a skin's default chip fill (a stronger
                  // rule than a plain bgcolor) would replace the tone with grey.
                  '&.MuiChip-filled': { bgcolor: alpha(meta.color, 0.12) },
                  color: 'text.secondary',
                  '& .MuiChip-label': { px: 0.9 },
                },
                // A skin's darker ground under the tint leaves secondary text
                // short of 4.5:1 at this size; the label takes the body colour.
                skinned({}, { color: 'text.primary' }),
              ]}
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
              sx={[
                {
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
                },
                // A status pill: its colour stays, and a skin gives it the depth of its chips.
                skinned({}, { boxShadow: tokenVar('chipShadow') }),
              ]}
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
      <Stack divider={<Divider sx={{ borderColor: 'divider', opacity: 0.7 }} />}>
        {Array.from({ length: RECENT_SUBMISSION_LIMIT }, (_, index) => (
          <SubmissionRowSkeleton key={index} />
        ))}
      </Stack>
    );
  }
  if (items.length === 0) {
    return (
      <Stack alignItems="center" spacing={1.25} sx={{ py: 7, px: 3, textAlign: 'center' }}>
        <Avatar
          variant="rounded"
          sx={[
            { width: 56, height: 56, borderRadius: 3, color: 'text.disabled' },
            // An empty inbox: a skin sinks the medallion in rather than tinting it.
            skinned(
              { bgcolor: 'action.hover' },
              { bgcolor: tokenVar('tileBg'), boxShadow: tokenVar('tileInsetShadow') },
            ),
          ]}
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
  /** One figure, or several (one per currency) that the tile stacks. */
  value: string | readonly string[];
  caption: string;
  icon: SvgIconComponent;
  to: string;
  accent: string;
  loading: boolean;
}

/**
 * A stat tile's figure. Several figures (cedis and dollars) stack at half the
 * size, two lines in the height of one, so the tile stays level with its row.
 *
 * Either way the size gives way to the tile's width: "GH₵250,251" at the full
 * size is wider than a tile on a laptop. Counts and short totals keep it.
 */
const StatValue = ({ value, loading }: Pick<StatCardProps, 'value' | 'loading'>): JSX.Element => {
  const figures = typeof value === 'string' ? [value] : value;
  const stacked = !loading && figures.length > 1;
  let content: ReactNode = loading ? '—' : figures[0];
  if (stacked) {
    content = figures.map((figure) => (
      <Box key={figure} component="span" sx={{ display: 'block' }}>
        {figure}
      </Box>
    ));
  }
  return (
    // The tile's width, for the figure's size to be measured against.
    <Box sx={{ containerType: 'inline-size' }}>
      <Typography
        variant="h3"
        sx={{
          mt: 2.25,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          color: loading ? 'text.disabled' : 'text.primary',
          fontSize: fittedFontSize(loading ? ['—'] : figures, stacked ? '1.5rem' : '3rem'),
        }}
      >
        {content}
      </Typography>
    </Box>
  );
};

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
    sx={[
      {
        height: '100%',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        borderColor: tokenVar('surfaceBorderColor'),
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
        '&:hover::before': { width: 6 },
      },
      // Classic lifts the tile on a glow of its accent. A skin lifts it on its
      // own card shadow and leaves the edge its material's: the accent bar and
      // the tinted icon already carry the tone.
      skinned(
        {
          '&:hover': {
            borderColor: alpha(accent, 0.45),
            boxShadow: `0 14px 30px -16px ${alpha(accent, 0.55)}`,
            transform: 'translateY(-3px)',
          },
        },
        {
          '&:hover': {
            borderColor: tokenVar('surfaceBorderColor'),
            boxShadow: tokenVar('surfaceHoverShadow'),
          },
        },
      ),
    ]}
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
      <CardContent
        sx={{ flexGrow: 1, width: '100%', p: 2.75, position: 'relative', isolation: 'isolate' }}
      >
        <Icon
          aria-hidden
          sx={{
            position: 'absolute',
            right: -14,
            bottom: 30,
            fontSize: 132,
            color: (theme) => alpha(theme.palette.text.primary, 0.065),
            zIndex: -1,
            transform: 'rotate(-12deg)',
          }}
        />
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Avatar
            variant="rounded"
            sx={[
              { color: 'text.primary', width: 46, height: 46, borderRadius: 2.5 },
              toneTileSx(accent, 0.12, 0.18),
            ]}
          >
            <Icon fontSize="small" />
          </Avatar>
          <Box
            aria-hidden
            sx={[
              {
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
              },
              // The arrow's disc becomes one of the skin's small raised controls when it appears.
              skinned(
                {},
                { '.MuiCardActionArea-root:hover &': { boxShadow: tokenVar('controlShadow') } },
              ),
            ]}
          >
            <ArrowOutwardIcon sx={{ fontSize: 17 }} />
          </Box>
        </Stack>
        <StatValue value={value} loading={loading} />
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

/**
 * A dashboard panel: the skin's card, with a tinted header strip.
 *
 * The strip is fainter than the other section headers in Classic (0.035
 * against their 0.045), so Classic keeps its own tint and a skin uses its
 * section-header tint, which it tunes to its surfaces.
 */
const Panel = ({ title, subtitle, action, children }: PanelProps): JSX.Element => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      borderRadius: 3,
      borderColor: tokenVar('surfaceBorderColor'),
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={[
        { px: 2.75, py: 2.5 },
        skinned({ bgcolor: (theme) => alpha(theme.palette.primary.main, 0.035) }, surfaceSx.tinted),
      ]}
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
    sx={[
      {
        height: '100%',
        borderRadius: 2.5,
        borderColor: tokenVar('surfaceBorderColor'),
        transition: (t) => t.transitions.create(['border-color', 'background-color', 'box-shadow']),
      },
      // Classic washes the tile green under the pointer. A skin keeps its own
      // card material (a wash would thin Glass's frost) and lifts it instead.
      skinned(
        {
          '&:hover': {
            borderColor: alpha(brandColors.forestGreen, 0.4),
            bgcolor: alpha(brandColors.forestGreen, 0.04),
            boxShadow: `0 8px 18px -14px ${alpha(brandColors.forestGreen, 0.6)}`,
          },
        },
        {
          '&:hover': {
            borderColor: tokenVar('surfaceBorderColor'),
            bgcolor: tokenVar('surfaceBg'),
            boxShadow: tokenVar('surfaceHoverShadow'),
          },
        },
      ),
    ]}
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
          sx={[
            {
              width: 36,
              height: 36,
              borderRadius: 2,
              color: 'text.primary',
              fontSize: 15,
              fontWeight: 800,
            },
            toneTileSx(brandColors.forestGreen, 0.1, 0.16),
          ]}
        >
          {RESOURCES.find((resource) => resource.key === resourceKey)?.icon}
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

const providerSwitchTooltip = (
  status: PaymentProviderStatus,
  isAdmin: boolean,
  envHint: string,
): string => {
  if (!isAdmin) {
    return 'Only admins can change payment settings';
  }
  if (!status.configured) {
    return `Add ${envHint} to the API environment first`;
  }
  return '';
};

const providerHelperText = (
  providerKey: ProviderKey,
  status: PaymentProviderStatus,
  envHint: string,
): string => {
  if (!status.configured) {
    return `Add ${envHint} to the API environment`;
  }
  // Paystack signs its webhooks with the secret key: there is no second secret to miss.
  // (An API from before currencies does not say what it charges in.)
  if (providerKey === 'paystack') {
    return status.currency
      ? `Secret key configured · charges in ${status.currency}`
      : 'Secret key configured';
  }
  if (status.webhookConfigured) {
    return 'API key and webhook secret configured';
  }
  return 'API key configured · webhook secret missing';
};

/** An address that wraps after a slash on a narrow screen rather than mid-word. */
const breakableAddress = (address: string): ReactNode[] =>
  address
    .split('/')
    .flatMap((part, index, parts) =>
      index < parts.length - 1 ? [part, '/', <wbr key={index} />] : [part],
    );

/**
 * Paystack's return address and how its payments are confirmed. The owner's
 * Paystack account, webhook included, is shared with other apps, so the API
 * names its own return address on every payment and confirms payments itself,
 * when donors return and in the hourly run. Said only by an API that does so:
 * an older one reports no return address. Two short lines, so the panel grows
 * little beside its neighbour; the address drops its `https://` to fit one.
 */
const PaystackConfirmationNote = ({
  status,
}: {
  status: PaymentProviderStatus;
}): JSX.Element | null => {
  if (!status.configured || !status.returnUrl) {
    return null;
  }
  return (
    <>
      <Typography
        variant="caption"
        color="text.secondary"
        title={status.returnUrl}
        sx={{ display: 'block', overflowWrap: 'anywhere' }}
      >
        Returns donors to {breakableAddress(status.returnUrl.replace(/^https?:\/\//, ''))}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Confirmed on return and hourly, so no webhook is needed.
      </Typography>
    </>
  );
};

/**
 * The box around one payment gateway. Classic draws a hairline box, washed
 * green while the gateway is taking donations. A skin sinks the box into the
 * panel as one of its wells and keeps the green wash, because the wash says
 * the gateway is live.
 */
const providerWellSx = (accepting: boolean) =>
  skinned(
    {
      border: '1px solid',
      borderColor: 'divider',
      bgcolor: accepting ? alpha(brandColors.forestGreen, 0.04) : 'transparent',
    },
    {
      bgcolor: accepting ? alpha(brandColors.forestGreen, 0.04) : tokenVar('surfaceInsetBg'),
      border: tokenVar('surfaceInsetBorder'),
      boxShadow: tokenVar('surfaceInsetShadow'),
    },
  );

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
      sx={[{ p: 1.75, borderRadius: 2.5 }, providerWellSx(status.accepting)]}
    >
      <Avatar
        variant="rounded"
        sx={[
          { width: 40, height: 40, borderRadius: 2, color: 'text.primary' },
          toneTileSx(brandColors.forestGreen, 0.1, 0.16),
        ]}
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
          {providerHelperText(providerKey, status, meta.envHint)}
        </Typography>
        {providerKey === 'paystack' && <PaystackConfirmationNote status={status} />}
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

/** The loading shape of a ProviderRow, built from the same padding and avatar. */
const ProviderRowSkeleton = (): JSX.Element => (
  <Stack
    direction="row"
    spacing={1.75}
    alignItems="center"
    sx={[{ p: 1.75, borderRadius: 2.5 }, providerWellSx(false)]}
  >
    <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 2, flexShrink: 0 }} />
    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
      <Skeleton variant="text" width="40%" sx={{ fontSize: '0.875rem' }} />
      <Skeleton variant="text" width="75%" sx={{ fontSize: '0.75rem' }} />
    </Box>
    <Skeleton variant="rounded" width={34} height={20} sx={{ borderRadius: 10, flexShrink: 0 }} />
  </Stack>
);

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
    <Panel title="Payment providers" subtitle="Enable or disable donation gateways">
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        {loading || !payments ? (
          <>
            <ProviderRowSkeleton />
            <ProviderRowSkeleton />
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
          A provider only accepts donations when it is enabled here AND its API keys are set in the
          API environment. Webhooks keep working for donations already in flight.
        </Typography>
      </Stack>
    </Panel>
  );
};

// ── Donations visualization ─────────────────────────────────────────────────

/** Height of the donations bar chart, shared with its loading placeholder. */
const DONATION_CHART_HEIGHT = 200;

/** Height of the line naming a chart's currency, taken out of the chart's own height. */
const CURRENCY_CAPTION_HEIGHT = 22;

/** The loading shape of a ProviderSplitBar: a label line above its track. */
const ProviderSplitBarSkeleton = (): JSX.Element => (
  <Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
      <Skeleton variant="text" width={64} sx={{ fontSize: '0.75rem' }} />
      <Skeleton variant="text" width={72} sx={{ fontSize: '0.75rem' }} />
    </Stack>
    <Skeleton variant="rounded" height={6} sx={{ borderRadius: 99 }} />
  </Box>
);

/**
 * One provider's line under the chart: its figures per currency and its gifts,
 * and how full its bar is. With one currency across all completed gifts the bar
 * is the provider's share of the money, as it always was. With cedis and dollars
 * both in, there is no total to take a share of, so the bar is the provider's
 * share of the gifts, and the line says so: "4 of 9 gifts".
 */
const providerSplit = (
  totals: DashboardProviderDonations,
  donations: DashboardSummary['donations'],
): { parts: string[]; share: number; shareOf: string } => {
  const [only, ...others] = donations.raised;
  const mixed = others.length > 0;
  const gifts = mixed
    ? `${totals.count} of ${donations.succeededCount} gifts`
    : `${totals.count} ${totals.count === 1 ? 'gift' : 'gifts'}`;
  const parts = [
    ...totals.raised.map((entry) => formatMoney(entry.amount, entry.currency)),
    ...(totals.count > 0 ? [gifts] : []),
  ];
  let share = 0;
  if (mixed && donations.succeededCount > 0) {
    share = totals.count / donations.succeededCount;
  } else if (!mixed && only && only.amount > 0) {
    share = amountIn(totals.raised, only.currency) / only.amount;
  }
  return {
    parts: parts.length > 0 ? parts : ['No gifts yet'],
    share,
    shareOf: mixed ? 'completed gifts' : 'the money raised',
  };
};

const ProviderSplitBar = ({
  label,
  parts,
  share,
  shareOf,
  color,
}: {
  label: string;
  parts: readonly string[];
  share: number;
  /** What the bar is a share of, for the reader who cannot see it. */
  shareOf: string;
  color: string;
}): JSX.Element => (
  <Box>
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        component="div"
        color="text.secondary"
        sx={{ minWidth: 0, textAlign: 'right' }}
      >
        <DotList parts={parts} align="end" />
      </Typography>
    </Stack>
    <Box
      role="img"
      aria-label={`${label}: ${Math.round(share * 100)}% of ${shareOf}`}
      sx={[{ height: 6, borderRadius: 99, overflow: 'hidden' }, toneTrackSx(color)]}
    >
      <Box
        sx={{
          height: '100%',
          width: `${Math.round(share * 100)}%`,
          borderRadius: 99,
          bgcolor: color,
        }}
      />
    </Box>
  </Box>
);

/** The currencies with gifts in the chart's months, cedis first. */
const chartedCurrencies = (monthly: DashboardDonationMonth[]): DonationCurrency[] =>
  DONATION_CURRENCIES.filter((currency) =>
    monthly.some((bucket) => amountIn(bucket.raised, currency) > 0),
  );

/** One currency's months as bars, labelled in that currency. */
const CurrencyChart = ({
  monthly,
  currency,
  labelled,
  fluid = false,
}: {
  monthly: DashboardDonationMonth[];
  currency: DonationCurrency;
  labelled: boolean;
  /** Half width or narrower: draw at the real width rather than shrink. */
  fluid?: boolean;
}): JSX.Element => {
  const chart = (
    <BarChart
      fluid={fluid}
      height={DONATION_CHART_HEIGHT - (labelled ? CURRENCY_CAPTION_HEIGHT : 0)}
      data={monthly.map((bucket) => {
        const value = amountIn(bucket.raised, currency);
        return {
          label: bucket.month,
          value,
          displayValue: value > 0 ? formatMoney(value, currency, { compact: true }) : undefined,
        };
      })}
      color={brandColors.gold}
      formatLabel={monthShortLabel}
      formatValue={(value) => formatMoney(value, currency, { compact: true })}
    />
  );
  if (!labelled) {
    return chart;
  }
  const rules = DONATION_CURRENCY_RULES[currency];
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', height: CURRENCY_CAPTION_HEIGHT, fontWeight: 700 }}
      >
        {rules.name} ({rules.symbol})
      </Typography>
      {chart}
    </Box>
  );
};

/**
 * The last six months of completed gifts. Each currency gets its own chart on
 * its own scale, side by side: bars in cedis next to bars in dollars on one
 * axis would make a cedi gift look a dozen times larger than the same gift in
 * dollars. With one currency there is one chart, as there always was.
 */
const DonationCharts = ({
  donations,
}: {
  donations: DashboardSummary['donations'];
}): JSX.Element => {
  const currencies = chartedCurrencies(donations.monthly);
  // Name the currency whenever more than one is in play, even if only one has
  // gifts in these months, so a lone chart is not read as the whole total.
  const labelled = currencies.length > 1 || donations.raised.length > 1;
  if (currencies.length === 0) {
    return (
      <DonationChartEmpty
        hasHistory={donations.succeededCount > 0}
        needsReview={donations.pendingCount > 0 || donations.failedCount > 0}
      />
    );
  }
  if (currencies.length === 1) {
    return (
      <CurrencyChart monthly={donations.monthly} currency={currencies[0]!} labelled={labelled} />
    );
  }
  return (
    <Grid container spacing={2.5}>
      {currencies.map((currency) => (
        <Grid key={currency} size={{ xs: 12, md: 6 }}>
          <CurrencyChart monthly={donations.monthly} currency={currency} labelled fluid />
        </Grid>
      ))}
    </Grid>
  );
};

const DonationsPanel = ({
  summary,
  loading,
}: {
  summary?: DashboardSummary;
  loading: boolean;
}): JSX.Element => {
  const donations = summary?.donations;
  // What "nothing raised yet" is written in: the currencies gifts are being taken in.
  const zero = zeroCurrencies(summary?.payments);
  return (
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
          {/*
          The loaded panel is a total, a chart, a rule and two provider bars.
          Drawing only the first two left the card a third shorter than it ends
          up, so everything below it jumped when the figures arrived.
        */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: 2 }}
          >
            <Box sx={{ width: '100%' }}>
              <Skeleton variant="text" width={160} sx={{ fontSize: '2.125rem' }} />
              <Skeleton variant="text" width={190} sx={{ fontSize: '0.75rem' }} />
            </Box>
            <Stack direction="row" spacing={1}>
              <Skeleton variant="rounded" width={86} height={24} sx={{ borderRadius: 10 }} />
              <Skeleton variant="rounded" width={74} height={24} sx={{ borderRadius: 10 }} />
            </Stack>
          </Stack>
          <Skeleton variant="rounded" height={DONATION_CHART_HEIGHT} />
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.25}>
            <ProviderSplitBarSkeleton />
            <ProviderSplitBarSkeleton />
          </Stack>
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
                <DotList parts={raisedFigures(donations.raised, zero)} />
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

          <DonationCharts donations={donations} />

          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.25}>
            <ProviderSplitBar
              label="Stripe"
              {...providerSplit(donations.byProvider.stripe, donations)}
              color={brandColors.forestGreen}
            />
            <ProviderSplitBar
              label="Paystack"
              {...providerSplit(donations.byProvider.paystack, donations)}
              color={brandColors.mint}
            />
          </Stack>
        </Box>
      )}
    </Panel>
  );
};

// ── Submissions breakdown ───────────────────────────────────────────────────

const SUBMISSION_TYPE_ORDER: Submission['type'][] = [
  SubmissionType.Contact,
  SubmissionType.Partner,
  SubmissionType.Volunteer,
  SubmissionType.Job,
];

/** Diameter of the submissions donut, shared with its loading placeholder. */
const DONUT_SIZE = 168;

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
          {/*
            The donut sits in a row beside its legend, with status chips below.
            A lone centred circle both sat in the wrong place and left out two
            thirds of the panel's height.
          */}
          <Stack direction="row" spacing={2.5} alignItems="center" sx={{ width: '100%' }}>
            <Skeleton
              variant="circular"
              width={DONUT_SIZE}
              height={DONUT_SIZE}
              sx={{ flexShrink: 0 }}
            />
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              {SUBMISSION_TYPE_ORDER.map((type) => (
                <Skeleton key={type} variant="text" width="80%" sx={{ fontSize: '0.75rem' }} />
              ))}
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
            <Skeleton variant="rounded" width={62} height={24} sx={{ borderRadius: 10 }} />
            <Skeleton variant="rounded" width={66} height={24} sx={{ borderRadius: 10 }} />
            <Skeleton variant="rounded" width={86} height={24} sx={{ borderRadius: 10 }} />
          </Stack>
        </Box>
      ) : (
        <Box sx={{ p: 2.5 }}>
          <DonutChart
            size={DONUT_SIZE}
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

/** Where a counted collection is managed: events have their own pages. */
const contentPath = (key: string): string => (key === 'events' ? '/events' : `/content/${key}`);

const ContentInventoryPanel = ({
  content,
  loading,
  manageTo,
  rows,
}: {
  content?: DashboardSummary['content'];
  loading: boolean;
  /** The first collection this person may open. */
  manageTo: string;
  /** How many collections this person may open, for the loading shape. */
  rows: number;
}): JSX.Element => (
  <Panel
    title="Content inventory"
    subtitle="Live vs total across collections"
    action={
      <Button
        component={RouterLink}
        to={manageTo}
        size="small"
        endIcon={<ChevronRightIcon />}
        sx={{ fontWeight: 600 }}
      >
        Manage
      </Button>
    }
  >
    <Grid container spacing={1.5} sx={{ p: 2.5 }}>
      {(loading || !content ? Array.from({ length: rows }) : content).map((entry, index) => (
        <Grid
          key={entry ? (entry as DashboardSummary['content'][number]).key : index}
          size={{ xs: 12, sm: 6 }}
        >
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

/**
 * A collection row you can open. Classic outlines it and washes it green under
 * the pointer. A skin makes it one of its raised controls instead: lifted at
 * rest, higher under the pointer, pressed in while held.
 */
const inventoryRowSx = skinned(
  {
    border: '1px solid',
    borderColor: 'divider',
    '&:hover': {
      borderColor: alpha(brandColors.forestGreen, 0.4),
      bgcolor: alpha(brandColors.forestGreen, 0.04),
    },
  },
  {
    ...surfaceSx.raised,
    '&:hover': {
      bgcolor: tokenVar('surfaceRaisedBg'),
      border: tokenVar('surfaceRaisedBorder'),
      boxShadow: tokenVar('controlHoverShadow'),
    },
    '&:active': surfaceSx.pressed,
  },
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
      to={contentPath(entry.key)}
      sx={[
        {
          display: 'block',
          p: 1.75,
          borderRadius: 2.5,
          transition: (t) => t.transitions.create(['border-color', 'background-color']),
          '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
        },
        inventoryRowSx,
      ]}
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
        sx={[
          { height: 6, borderRadius: 99, overflow: 'hidden' },
          toneTrackSx(brandColors.forestGreen),
        ]}
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
    sx={[
      {
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        '& .MuiCardActionArea-focusHighlight': { opacity: 0 },
      },
      toneRowHoverSx(accent),
    ]}
  >
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar
        variant="rounded"
        sx={[
          { width: 34, height: 34, borderRadius: 2, color: 'text.secondary' },
          toneTileSx(accent, 0.12, 0.16),
        ]}
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

/**
 * The rows of the operations snapshot, as data.
 *
 * Keeping them in one list is what lets the loading state draw exactly as many
 * rows as will appear: it used to draw three where four arrive, each of them
 * twice the height of the real thing.
 */
interface SystemRowSpec {
  icon: SvgIconComponent;
  label: string;
  to: string;
  accent: string;
  value: (summary: DashboardSummary) => string;
}

/** Only the rows for pages this person may open; the content row counts only theirs. */
const systemRowsFor = (mayOpen: (to: string) => boolean, content: ContentAccess): SystemRowSpec[] =>
  [
    ...SYSTEM_ROWS,
    {
      icon: AutoStoriesIcon,
      label: 'Content collections live',
      to: content.manageTo ?? '',
      accent: brandColors.deepForest,
      value: (summary: DashboardSummary) =>
        `${content.readable(summary.content).reduce((sum, entry) => sum + entry.published, 0)} items`,
    },
  ].filter((row) => row.to !== '' && mayOpen(row.to));

const SYSTEM_ROWS: SystemRowSpec[] = [
  {
    icon: CalendarMonthIcon,
    label: 'Upcoming events',
    to: '/events',
    accent: brandColors.forestGreen,
    value: (summary) => `${summary.events.upcoming} / ${summary.events.total}`,
  },
  {
    icon: PrivacyTipIcon,
    label: 'Open privacy requests',
    to: '/privacy-requests',
    accent: brandColors.gold,
    value: (summary) => String(summary.privacyRequests.open),
  },
  {
    icon: ShareIcon,
    label: 'Social accounts connected',
    to: '/social-connections',
    accent: brandColors.mint,
    value: (summary) => String(summary.socialConnections),
  },
];

/** The loading shape of a SystemRow, from that row's own padding and avatar. */
const SystemRowSkeleton = (): JSX.Element => (
  <Box sx={{ px: 1.5, py: 1.25 }}>
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Skeleton variant="rounded" width={34} height={34} sx={{ borderRadius: 2, flexShrink: 0 }} />
      <Skeleton variant="text" sx={{ flexGrow: 1, fontSize: '0.875rem' }} />
      <Skeleton variant="text" width={38} sx={{ fontSize: '0.875rem' }} />
    </Stack>
  </Box>
);

const SystemPanel = ({
  summary,
  loading,
  rows,
}: {
  summary?: DashboardSummary;
  loading: boolean;
  rows: SystemRowSpec[];
}): JSX.Element => (
  <Panel title="Operations snapshot" subtitle="Across the whole console">
    <Stack sx={{ p: 1 }}>
      {loading || !summary
        ? rows.map((row) => <SystemRowSkeleton key={row.label} />)
        : rows.map((row) => (
            <SystemRow
              key={row.label}
              icon={row.icon}
              label={row.label}
              value={row.value(summary)}
              to={row.to}
              accent={row.accent}
            />
          ))}
    </Stack>
  </Panel>
);

// ── Page ────────────────────────────────────────────────────────────────────

const sortRecent = (items: Submission[] | undefined): Submission[] =>
  [...(items ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_SUBMISSION_LIMIT);

/** `newCount` is null for someone who cannot read submissions: the inbox is not theirs. */
const buildSubtitle = (newCount: number | null): string => {
  if (newCount === null) {
    return 'Keep the Impact Africa Alliance site fresh and current.';
  }
  if (newCount > 0) {
    return `You have ${newCount} new submission${newCount === 1 ? '' : 's'} waiting for review.`;
  }
  return 'Inbox is clear. Keep the Impact Africa Alliance site fresh and current.';
};

const buildRoleStat = (
  isAdmin: boolean,
  data: DashboardSummary | undefined,
  loading: boolean,
  content: ContentAccess,
): StatCardProps | null => {
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
  if (!content.manageTo) return null;
  return {
    label: 'Content types',
    value: String(content.resources.length),
    caption: 'Collections to manage',
    icon: PersonOutlineIcon,
    to: content.manageTo,
    accent: brandColors.deepForest,
    loading: false,
  };
};

/** The stat cards for the pages this person may open, and no others. */
const buildStats = (
  isAdmin: boolean,
  data: DashboardSummary | undefined,
  loading: boolean,
  access: DashboardAccess,
): StatCardProps[] =>
  [...allStats(data, loading), buildRoleStat(isAdmin, data, loading, access.content)].filter(
    (stat): stat is StatCardProps => stat !== null && access.mayOpen(stat.to),
  );

const allStats = (data: DashboardSummary | undefined, loading: boolean): StatCardProps[] => [
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
  donationsStat(data, loading),
];

const donationsStat = (data: DashboardSummary | undefined, loading: boolean): StatCardProps => ({
  label: 'Donations raised',
  // Whole cedis and dollars: the tile is a glance, and the Donations page has the pesewas.
  value: raisedFigures(data?.donations.raised ?? [], zeroCurrencies(data?.payments), {
    whole: true,
  }),
  caption: `${data?.donations.succeededCount ?? 0} succeeded gifts`,
  icon: VolunteerActivismIcon,
  to: '/donations',
  accent: brandColors.gold,
  loading,
});

const HeaderActions = ({ mayOpen }: { mayOpen: (to: string) => boolean }): JSX.Element | null => {
  const submissions = mayOpen('/submissions');
  const subscribers = mayOpen('/subscribers');
  if (!submissions && !subscribers) return null;
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}
    >
      {submissions && (
        <Button
          component={RouterLink}
          to="/submissions"
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          sx={{
            borderRadius: tokenVar('buttonRadius'),
            px: 2.5,
            fontWeight: 600,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          Review submissions
        </Button>
      )}
      {subscribers && (
        <Button
          component={RouterLink}
          to="/subscribers"
          variant="outlined"
          startIcon={<MailOutlineIcon />}
          sx={{
            borderRadius: tokenVar('buttonRadius'),
            px: 2.5,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          Newsletter
        </Button>
      )}
    </Stack>
  );
};

const ManageContentPanel = ({ resources }: { resources: typeof RESOURCES }): JSX.Element => (
  <Panel title="Manage content" subtitle="Jump into a collection">
    <Grid container spacing={1.5} sx={{ p: 2.5 }}>
      {resources.map((resource) => (
        // Four across on a wide screen now the panel has the full width;
        // two would leave half the row empty.
        <Grid key={resource.key} size={{ xs: 12, sm: 6, lg: 3 }}>
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

/** What of the content this person may open. */
interface ContentAccess {
  /** The CMS collections they may read, in sidebar order. */
  resources: typeof RESOURCES;
  /** The first of them, or null when there is none. */
  manageTo: string | null;
  /** The first counted collection they may open (events included), or null. */
  inventoryTo: string | null;
  /** How many counted collections they may open. */
  countedRows: number;
  /** The counted collections among the summary's. */
  readable: (content: DashboardSummary['content']) => DashboardSummary['content'];
}

interface DashboardAccess {
  mayOpen: (to: string) => boolean;
  content: ContentAccess;
}

const contentAccessFor = (mayOpen: (to: string) => boolean): ContentAccess => {
  const resources = RESOURCES.filter((resource) => mayOpen(`/content/${resource.key}`));
  const counted = DASHBOARD_CONTENT_COLLECTIONS.filter((entry) => mayOpen(contentPath(entry.key)));
  return {
    resources,
    manageTo: resources[0] ? `/content/${resources[0].key}` : null,
    inventoryTo: counted[0] ? contentPath(counted[0].key) : null,
    countedRows: counted.length,
    readable: (content) => content.filter((entry) => mayOpen(contentPath(entry.key))),
  };
};

/** Four across when all four stats show; fewer share the row between them. */
const statColumns = (count: number): number => (count >= 4 ? 3 : 12 / Math.max(count, 2));

/**
 * Two panels side by side. One alone takes the whole row, so a panel hidden
 * for want of a permission leaves no hole, and with neither there is no row.
 */
const PanelPair = ({
  first,
  second,
  firstColumns,
}: {
  first: ReactNode;
  second: ReactNode;
  firstColumns: number;
}): JSX.Element | null => {
  if (!first && !second) return null;
  const both = Boolean(first && second);
  return (
    <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
      {first && <Grid size={{ xs: 12, md: both ? firstColumns : 12 }}>{first}</Grid>}
      {second && <Grid size={{ xs: 12, md: both ? 12 - firstColumns : 12 }}>{second}</Grid>}
    </Grid>
  );
};

interface DashboardBodyProps {
  data: DashboardSummary | undefined;
  loading: boolean;
  isAdmin: boolean;
  recent: Submission[];
  recentLoading: boolean;
  onFeedback: (message: string, severity: 'success' | 'error') => void;
  access: DashboardAccess;
}

/**
 * Everything below the header. Each card, panel and link shows only when this
 * person may open the page it is about: a module they cannot read appears
 * nowhere, here as in the sidebar.
 */
const DashboardBody = ({
  data,
  loading,
  isAdmin,
  recent,
  recentLoading,
  onFeedback,
  access,
}: DashboardBodyProps): JSX.Element => {
  const { mayOpen, content } = access;
  const stats = buildStats(isAdmin, data, loading, access);
  const donations = mayOpen('/donations');
  const submissions = mayOpen('/submissions');
  const systemRows = systemRowsFor(mayOpen, content);
  return (
    <Stack spacing={3.5}>
      {/* The person's own tasks and the work waiting on them first: it is what
          they act on today. Renders nothing without any of its permissions. */}
      <YourWorkPanel />

      {/* KPI stat cards */}
      {stats.length > 0 && (
        <Grid id="admin-dashboard-stats" container spacing={2.5}>
          {stats.map((stat) => (
            <Grid key={stat.label} size={{ xs: 12, sm: 6, md: statColumns(stats.length) }}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Donations — full width */}
      {donations && <DonationsPanel summary={data} loading={loading} />}

      {/* Payment providers + operations snapshot, side by side */}
      <PanelPair
        firstColumns={6}
        first={
          donations ? (
            <PaymentProvidersPanel
              payments={data?.payments}
              isAdmin={isAdmin}
              loading={loading}
              onFeedback={onFeedback}
            />
          ) : null
        }
        second={
          systemRows.length > 0 ? (
            <SystemPanel summary={data} loading={loading} rows={systemRows} />
          ) : null
        }
      />

      {/* Submissions breakdown + content inventory */}
      <PanelPair
        firstColumns={5}
        first={
          submissions ? (
            <SubmissionsBreakdownPanel submissions={data?.submissions} loading={loading} />
          ) : null
        }
        second={
          content.inventoryTo ? (
            <ContentInventoryPanel
              content={data?.content ? content.readable(data.content) : undefined}
              loading={loading}
              manageTo={content.inventoryTo}
              rows={content.countedRows}
            />
          ) : null
        }
      />

      {/* Recent activity, then the content shortcuts beneath it. Full width
          each: side by side, the submissions list was squeezed narrow enough to
          wrap every entry, and the shortcut grid was cramped into two columns. */}
      {submissions && (
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
      )}
      {content.resources.length > 0 && <ManageContentPanel resources={content.resources} />}
    </Stack>
  );
};

const Dashboard = (): JSX.Element => {
  const { user } = useAuth();
  const mayOpen = useMayOpen();
  const access = useMemo<DashboardAccess>(
    () => ({ mayOpen, content: contentAccessFor(mayOpen) }),
    [mayOpen],
  );
  const canReadSubmissions = mayOpen('/submissions');
  const summary = useDashboardSummary();
  // Read the donations whichever API answered: one from before currencies sends dollars.
  const data = useMemo(
    () =>
      summary.data && {
        ...summary.data,
        donations: summary.data.donations && readDonationsSummary(summary.data.donations),
      },
    [summary.data],
  );
  const recentSubmissions = useSubmissions({}, canReadSubmissions);
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
        description={`Welcome back, ${firstName}. ${buildSubtitle(
          canReadSubmissions ? (summary.data?.submissions.newCount ?? 0) : null,
        )}`}
        help={pageGuides.Dashboard}
        action={<HeaderActions mayOpen={mayOpen} />}
      />

      <RequirePermission resource="submissions" action="read">
        <NewSubmissionsBanner />
      </RequirePermission>

      {summary.isError && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          Couldn&apos;t load the dashboard overview — {summary.error.message}
        </Alert>
      )}

      <DashboardBody
        data={data}
        loading={summary.isLoading}
        isAdmin={user?.role === 'admin'}
        recent={sortRecent(recentSubmissions.data?.items)}
        recentLoading={recentSubmissions.isLoading}
        onFeedback={(message, severity) => setSnackbar({ message, severity })}
        access={access}
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
