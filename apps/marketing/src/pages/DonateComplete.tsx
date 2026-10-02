import {
  brandColors,
  formatMoney,
  type DonationConfirmation,
  type DonationCurrency,
} from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, keyframes } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';

import { CelebrationBurst } from '../components/CelebrationBurst';
import { Seo } from '../components/Seo';
import { Watermark } from '../components/Watermark';
import { ApiError, apiGet } from '../lib/api-client';

type PageState = 'loading' | 'succeeded' | 'pending' | 'cancelled' | 'failed' | 'missing';

/** Each state's colour, and what the header says above it. */
const STATE_LOOK: Record<PageState, { tone: string; eyebrow: string; lead: string }> = {
  loading: { tone: brandColors.mint, eyebrow: 'Donation status', lead: 'Checking with Paystack…' },
  succeeded: {
    tone: brandColors.mint,
    eyebrow: 'Donation confirmed',
    lead: 'Thank you for standing with young people, women and communities across Africa.',
  },
  pending: {
    tone: brandColors.gold,
    eyebrow: 'Almost there',
    lead: 'We are confirming your payment with Paystack.',
  },
  cancelled: {
    tone: brandColors.slate,
    eyebrow: 'Payment cancelled',
    lead: 'No payment was taken. You can give whenever you are ready.',
  },
  failed: {
    tone: '#E5484D',
    eyebrow: 'Donation status',
    lead: 'This payment did not go through.',
  },
  missing: {
    tone: '#E5484D',
    eyebrow: 'Donation status',
    lead: 'This page needs a payment reference from Paystack.',
  },
};

const popIn = keyframes`
  0% { transform: scale(0.4); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
`;

/** The status icon in a soft disc of its colour, with a gentle pop when it arrives. */
const StatusBadge = ({ icon: Icon, tone }: { icon: SvgIconComponent; tone: string }) => (
  <Box
    aria-hidden
    sx={{
      width: 72,
      height: 72,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      color: tone,
      bgcolor: alpha(tone, 0.14),
      boxShadow: `0 0 0 10px ${alpha(tone, 0.06)}`,
      animation: `${popIn} 600ms cubic-bezier(0.25, 1, 0.5, 1) both`,
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    }}
  >
    <Icon sx={{ fontSize: 38 }} />
  </Box>
);

const ReferenceLine = ({ reference }: { reference: string }): JSX.Element => (
  <Typography variant="body2" color="text.secondary">
    Reference: {reference}
  </Typography>
);

/** The gift in the currency it was made in: GH₵100 through Paystack, $100 by card. */
const SucceededView = ({
  amount,
  currency,
}: {
  amount?: number;
  currency?: DonationCurrency;
}): JSX.Element => (
  <>
    <StatusBadge icon={CheckRoundedIcon} tone={brandColors.mint} />
    {amount && currency ? (
      <Box>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.6 }}>
          Your gift
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '2.6rem', md: '3.2rem' },
            fontWeight: 800,
            lineHeight: 1,
            color: 'primary.main',
          }}
        >
          {formatMoney(amount, currency)}
        </Typography>
      </Box>
    ) : null}
    <Typography variant="h5" component="h2">
      Your donation was successful
    </Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      {amount && currency
        ? `We have received your donation of ${formatMoney(amount, currency)}. `
        : 'We have received your donation. '}
      Your support helps us equip youth, women, and communities across Africa. A receipt will be
      sent to your email address.
    </Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
      <Button component={RouterLink} to="/" variant="contained">
        Back to homepage
      </Button>
      <Button component={RouterLink} to="/impact" variant="outlined">
        See our impact
      </Button>
    </Stack>
  </>
);

const FailedView = ({
  reference,
  missing,
}: {
  reference: string;
  missing: boolean;
}): JSX.Element => (
  <>
    <StatusBadge icon={ErrorOutlineRoundedIcon} tone={STATE_LOOK.failed.tone} />
    <Typography variant="h5" component="h2">
      We could not confirm your donation
    </Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      {missing
        ? 'This page was opened without a payment reference.'
        : 'The payment was not completed or could not be verified. If money was deducted from your account, it will be reversed by your bank or you can contact us with your payment reference.'}
    </Typography>
    {reference && <ReferenceLine reference={reference} />}
    <Button
      component={RouterLink}
      to="/get-involved#donate"
      variant="contained"
      sx={{ alignSelf: 'flex-start' }}
    >
      Try again
    </Button>
  </>
);

/**
 * Not confirmed yet. The site hears nothing from Paystack on its own, so a payment that lands
 * after the donor is back (mobile money approved later) is confirmed by the API's hourly check.
 * That runs once an hour, and a run can come late, so the page says "usually".
 */
const PendingView = ({
  reference,
  checking,
  onCheck,
}: {
  reference: string;
  checking: boolean;
  onCheck: () => void;
}): JSX.Element => (
  <>
    <StatusBadge icon={HourglassTopRoundedIcon} tone={brandColors.gold} />
    <Typography variant="h5" component="h2">
      Your payment is being confirmed
    </Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      Paystack has not confirmed it yet. If you paid, your donation will usually be confirmed within
      an hour, so there is no need to pay again.
    </Typography>
    <ReferenceLine reference={reference} />
    <Button
      variant="contained"
      disabled={checking}
      onClick={onCheck}
      sx={{ alignSelf: 'flex-start' }}
    >
      {checking ? 'Checking…' : 'Check again'}
    </Button>
  </>
);

/**
 * Paystack's Cancel button brings the donor here. Nothing was paid, unless the quiet check the
 * page still makes finds a payment Paystack confirms (mobile money approved as they cancelled).
 */
const CancelledView = (): JSX.Element => (
  <>
    <StatusBadge icon={UndoRoundedIcon} tone={brandColors.slate} />
    <Typography variant="h5" component="h2">
      You cancelled the payment
    </Typography>
    <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
      Nothing was charged. If you would still like to give, you can start again whenever you are
      ready.
    </Typography>
    <Button
      component={RouterLink}
      to="/get-involved#donate"
      variant="contained"
      sx={{ alignSelf: 'flex-start' }}
    >
      Back to donate
    </Button>
  </>
);

const LoadingView = (): JSX.Element => (
  <Stack
    role="status"
    aria-label="Confirming your donation with Paystack"
    spacing={2}
    sx={{ width: '100%' }}
  >
    <Skeleton variant="circular" width={72} height={72} />
    <Skeleton width="70%" height={36} />
    <Skeleton width="90%" height={24} />
    <Skeleton width="55%" height={24} />
  </Stack>
);

interface PanelItem {
  icon: SvgIconComponent;
  title: string;
  text: string;
  /** A page to go to: the whole row becomes a link. */
  to?: string;
}

/** What the side panel offers in each state. */
const PANEL: Record<PageState, { title: string; items: PanelItem[] }> = {
  loading: { title: 'While we check', items: [] },
  succeeded: {
    title: 'What happens next',
    items: [
      {
        icon: ReceiptLongOutlinedIcon,
        title: 'Your receipt',
        text: 'Look out for a payment receipt in your email inbox.',
      },
      {
        icon: VolunteerActivismOutlinedIcon,
        title: 'Your gift goes to work',
        text: 'It funds skills training, mentorship and community programmes.',
      },
      {
        icon: InsightsOutlinedIcon,
        title: 'We report back',
        text: 'Donation usage reports are published every year.',
        to: '/resources',
      },
    ],
  },
  pending: {
    title: 'While you wait',
    items: [
      {
        icon: HourglassTopRoundedIcon,
        title: 'Give it a little time',
        text: 'Mobile money can take a few minutes to approve on your phone.',
      },
      {
        icon: ReceiptLongOutlinedIcon,
        title: 'Keep your reference',
        text: 'It is how we find your payment if you get in touch.',
      },
      {
        icon: SupportAgentOutlinedIcon,
        title: 'Talk to us',
        text: 'Our team can look into a payment for you.',
        to: '/contact',
      },
    ],
  },
  cancelled: {
    title: 'Other ways to make a difference',
    items: [
      {
        icon: VolunteerActivismOutlinedIcon,
        title: 'Volunteer or mentor',
        text: 'Share your time and skills with our programmes.',
        to: '/get-involved#volunteer',
      },
      {
        icon: HandshakeOutlinedIcon,
        title: 'Partner with us',
        text: 'Bring your organisation alongside the Alliance.',
        to: '/get-involved#partner',
      },
      {
        icon: MailOutlineRoundedIcon,
        title: 'Talk to us about giving',
        text: 'Ask about other ways to give, or a gift in kind.',
        to: '/contact',
      },
    ],
  },
  failed: {
    title: 'Need a hand?',
    items: [
      {
        icon: SupportAgentOutlinedIcon,
        title: 'Contact our team',
        text: 'Send us your payment reference and we will check it for you.',
        to: '/contact',
      },
      {
        icon: VolunteerActivismOutlinedIcon,
        title: 'Other ways to help',
        text: 'Volunteer, mentor, or partner with the Alliance.',
        to: '/get-involved#volunteer',
      },
    ],
  },
  missing: {
    title: 'Need a hand?',
    items: [
      {
        icon: SupportAgentOutlinedIcon,
        title: 'Contact our team',
        text: 'Tell us what happened and we will look into it.',
        to: '/contact',
      },
    ],
  },
};

const PanelRow = ({ item, tone }: { item: PanelItem; tone: string }): JSX.Element => {
  const { icon: Icon } = item;
  const body = (
    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ width: '100%' }}>
      <Box
        aria-hidden
        sx={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: 2.5,
          display: 'grid',
          placeItems: 'center',
          color: tone,
          bgcolor: alpha(tone, 0.12),
        }}
      >
        <Icon sx={{ fontSize: 22 }} />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0, textAlign: 'left' }}>
        <Typography variant="subtitle1" component="span" sx={{ display: 'block', fontWeight: 700 }}>
          {item.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" component="span">
          {item.text}
        </Typography>
      </Box>
      {item.to && (
        <ArrowForwardRoundedIcon
          aria-hidden
          sx={{ alignSelf: 'center', fontSize: 20, color: 'text.secondary' }}
        />
      )}
    </Stack>
  );
  if (!item.to) {
    return <Box sx={{ p: 1.5 }}>{body}</Box>;
  }
  return (
    <ButtonBase
      component={RouterLink}
      to={item.to}
      sx={{
        p: 1.5,
        borderRadius: 3,
        transition: 'background-color 160ms ease',
        '&:hover, &:focus-visible': { bgcolor: (t) => alpha(t.palette.text.primary, 0.05) },
      }}
    >
      {body}
    </ButtonBase>
  );
};

/** The column beside the status: what to expect next, or somewhere useful to go. */
const SidePanel = ({ state }: { state: PageState }): JSX.Element => {
  const { title, items } = PANEL[state];
  const { tone } = STATE_LOOK[state];
  return (
    <Box
      component="aside"
      aria-label={title}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        border: 1,
        borderColor: 'divider',
        borderRadius: 4,
        p: { xs: 2.5, md: 3.5 },
        bgcolor: (t) => alpha(t.palette.text.secondary, 0.045),
        '& > :not([aria-hidden])': { position: 'relative', zIndex: 1 },
      }}
    >
      <Watermark
        variant="network"
        position="bottom-right"
        size={{ xs: 220, md: 300 }}
        opacity={0.06}
        sx={{ color: 'text.secondary', animation: 'none' }}
      />
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={64} />
          <Skeleton variant="rounded" height={64} />
        </Stack>
      ) : (
        <Stack spacing={0.5} sx={{ mx: -1.5 }}>
          {items.map((item) => (
            <PanelRow key={item.title} item={item} tone={tone} />
          ))}
        </Stack>
      )}
    </Box>
  );
};

/**
 * The API's 404: the reference is not one of the site's gifts. Any other failure (Paystack or
 * the API out of reach for a moment) says nothing about the payment, which the hourly check
 * will still confirm.
 */
const isUnknownGift = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404;

const pageStateOf = ({
  reference,
  cancelled,
  confirmation,
  waiting,
  error,
}: {
  reference: string;
  cancelled: boolean;
  confirmation: DonationConfirmation | undefined;
  waiting: boolean;
  error: unknown;
}): PageState => {
  // Straight away, without waiting for the check: only a confirmed payment changes it.
  if (cancelled && confirmation?.status !== 'succeeded') return 'cancelled';
  if (!reference) return 'missing';
  if (waiting) return 'loading';
  if (isUnknownGift(error) || confirmation?.status === 'failed') return 'failed';
  if (confirmation?.status === 'succeeded') return 'succeeded';
  return 'pending';
};

/** The status card: the state's own message and actions, on the same surface as the form. */
const StatusCard = ({ children }: { children: ReactNode }): JSX.Element => (
  <Stack
    spacing={2.5}
    alignItems="flex-start"
    sx={{
      height: '100%',
      border: 1,
      borderColor: 'divider',
      borderRadius: 4,
      p: { xs: 3, md: 4.5 },
      bgcolor: 'background.paper',
    }}
  >
    {children}
  </Stack>
);

/**
 * Landing page for the Paystack checkout: its `callback_url` after paying, and its
 * `cancel_action` (`?cancelled=1`) when the donor presses Cancel. The API builds both.
 */
const DonateComplete = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? '';
  const cancelled = searchParams.get('cancelled') === '1';

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['paystack-verify', reference],
    queryFn: () =>
      apiGet<DonationConfirmation>(`/payments/paystack/verify/${encodeURIComponent(reference)}`),
    enabled: Boolean(reference),
    retry: 1,
  });

  const state = pageStateOf({
    reference,
    cancelled,
    confirmation: data,
    waiting: Boolean(reference) && (isLoading || !data) && !isError,
    error,
  });
  const look = STATE_LOOK[state];
  // Slate reads on the light card but not on the dark header: there, a light neutral instead.
  const headerTone = state === 'cancelled' ? alpha(brandColors.white, 0.72) : look.tone;

  const body: Record<PageState, () => JSX.Element> = {
    loading: () => <LoadingView />,
    cancelled: () => <CancelledView />,
    missing: () => <FailedView reference="" missing />,
    failed: () => <FailedView reference={reference} missing={false} />,
    succeeded: () => <SucceededView amount={data?.amount} currency={data?.currency} />,
    pending: () => (
      <PendingView reference={reference} checking={isFetching} onCheck={() => void refetch()} />
    ),
  };

  return (
    <>
      <Seo
        title="Donation status"
        description="Confirming your donation to Impact Africa Alliance."
      />
      {state === 'succeeded' && <CelebrationBurst />}
      <Box
        component="header"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'common.black',
          color: 'common.white',
          py: { xs: 7, md: 10 },
          '& > :not([aria-hidden])': { position: 'relative', zIndex: 1 },
        }}
      >
        <Watermark
          variant="africa"
          position="bottom-right"
          size={{ xs: 260, md: 420 }}
          opacity={0.14}
          color={headerTone}
        />
        <Container>
          <Typography
            variant="overline"
            sx={{ display: 'block', color: headerTone, letterSpacing: 2, mb: 1 }}
          >
            {look.eyebrow}
          </Typography>
          <Typography
            variant="h1"
            sx={{ fontSize: { xs: '2.4rem', md: '3.25rem' }, lineHeight: 1.08 }}
          >
            {state === 'succeeded' ? 'Thank you for your donation' : 'Donation status'}
          </Typography>
          <Typography
            sx={{
              mt: 2,
              maxWidth: 620,
              color: alpha(brandColors.white, 0.78),
              fontSize: '1.05rem',
            }}
          >
            {look.lead}
          </Typography>
        </Container>
      </Box>

      <Box component="section" sx={{ position: 'relative', overflow: 'hidden' }}>
        <Watermark
          variant="contours"
          position="top-right"
          size={{ xs: 280, md: 520 }}
          opacity={0.05}
          sx={{ color: 'text.secondary', animation: 'none' }}
        />
        <Container sx={{ position: 'relative', py: { xs: 5, md: 8 } }}>
          <Grid container spacing={{ xs: 3, md: 4 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <StatusCard>{body[state]()}</StatusCard>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <SidePanel state={state} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default DonateComplete;
