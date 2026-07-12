import { SubmissionStatus, SubmissionType, brandColors, type Submission } from '@iaa/shared';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { AccountPanel, AccountSectionHeader } from '../../components/account/AccountSurface';
import { CardListSkeleton } from '../../components/CardListSkeleton';
import { useSubmissions, useUpdateSubmissionStatus } from '../../lib/admin-hooks';
import { formatUtcShort } from '../../lib/date';

interface TypeMeta {
  icon: JSX.Element;
  label: string;
  color: string;
}

const TYPE_META: Record<Submission['type'], TypeMeta> = {
  [SubmissionType.Contact]: {
    icon: <MailOutlineRoundedIcon />,
    label: 'Contact',
    color: brandColors.forestGreen,
  },
  [SubmissionType.Partner]: { icon: <HandshakeRoundedIcon />, label: 'Partner', color: brandColors.gold },
  [SubmissionType.Volunteer]: {
    icon: <VolunteerActivismRoundedIcon />,
    label: 'Volunteer',
    color: brandColors.mint,
  },
  [SubmissionType.Job]: {
    icon: <WorkOutlineRoundedIcon />,
    label: 'Job',
    color: brandColors.deepForest,
  },
};

const summarize = (payload: Record<string, unknown>): string => {
  const str = (key: string): string | undefined =>
    typeof payload[key] === 'string' && (payload[key] as string).trim()
      ? (payload[key] as string)
      : undefined;
  const name = str('name') ?? str('fullName') ?? str('organizationName') ?? str('organization');
  const detail = str('subject') ?? str('message') ?? str('expertise') ?? str('email');
  return [name, detail].filter(Boolean).join(' · ') || 'New submission received';
};

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) {
    return '';
  }
  const minutes = Math.round(diff / 60000);
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

const NotificationCard = ({ submission }: { submission: Submission }): JSX.Element => {
  const update = useUpdateSubmissionStatus();
  const meta = TYPE_META[submission.type];

  return (
    <AccountPanel>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{
          position: 'relative',
          p: 2.25,
          '&::before': {
            position: 'absolute',
            top: 16,
            bottom: 16,
            left: 0,
            width: 4,
            borderRadius: 99,
            bgcolor: meta.color,
            content: '""',
          },
        }}
      >
        <Avatar
          variant="rounded"
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            flexShrink: 0,
            color: 'text.secondary',
            bgcolor: alpha(meta.color, 0.12),
            boxShadow: `inset 0 0 0 1px ${alpha(meta.color, 0.2)}`,
          }}
        >
          {meta.icon}
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} alignItems="center">
            <Typography sx={{ fontWeight: 750 }}>
              New {meta.label.toLowerCase()} submission
            </Typography>
            <Chip size="small" label="Needs review" color="secondary" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
            {summarize(submission.payload)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {relativeTime(submission.createdAt)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button size="small" component={RouterLink} to="/submissions">
            View
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DoneRoundedIcon />}
            disabled={update.isPending}
            onClick={() => update.mutate({ id: submission.id, status: SubmissionStatus.Read })}
          >
            Mark read
          </Button>
        </Stack>
      </Stack>
    </AccountPanel>
  );
};

const NotificationsEmptyState = (): JSX.Element => (
  <AccountPanel sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
    <Box
      sx={{
        display: 'grid',
        width: 70,
        height: 70,
        mx: 'auto',
        placeItems: 'center',
        borderRadius: '50%',
        bgcolor: 'alpha(brandColors.forest, 0.08)',
        color: 'text.primary',
      }}
    >
      <DoneAllRoundedIcon sx={{ fontSize: 34 }} />
    </Box>
    <Typography variant="h5" sx={{ mt: 2 }}>
      You&apos;re all caught up
    </Typography>
    <Typography sx={{ maxWidth: 460, mx: 'auto', mt: 1, color: 'text.secondary', lineHeight: 1.7 }}>
      New contact, partner, volunteer, and job submissions will appear here as they come in.
    </Typography>
  </AccountPanel>
);

const Notifications = (): JSX.Element => {
  const { data, isLoading } = useSubmissions({ status: SubmissionStatus.New });
  const markRead = useUpdateSubmissionStatus();
  const items = data?.items ?? [];

  const markAllRead = (): void => {
    for (const submission of items) {
      markRead.mutate({ id: submission.id, status: SubmissionStatus.Read });
    }
  };

  const renderBody = (): JSX.Element => {
    if (isLoading) {
      return <CardListSkeleton count={3} />;
    }
    if (items.length === 0) {
      return <NotificationsEmptyState />;
    }
    return (
      <Stack spacing={1.5}>
        {items.map((submission) => (
          <NotificationCard key={submission.id} submission={submission} />
        ))}
      </Stack>
    );
  };

  return (
    <>
      <AccountSectionHeader
        icon={<NotificationsRoundedIcon />}
        title="Notifications"
        description="Inbound website activity that needs your attention."
        action={
          items.length > 0 ? (
            <Button
              variant="outlined"
              startIcon={<DoneAllRoundedIcon />}
              onClick={markAllRead}
              disabled={markRead.isPending}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 8 }}>{renderBody()}</Grid>
        <Grid size={{ xs: 12, xl: 4 }}>
          <AccountPanel sx={{ height: '100%', p: 3 }}>
            <Box
              sx={{
                display: 'grid',
                width: 54,
                height: 54,
                placeItems: 'center',
                borderRadius: 2.5,
                bgcolor: 'alpha(brandColors.forest, 0.08)',
                color: 'text.primary',
              }}
            >
              <MarkEmailReadRoundedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h6" sx={{ mt: 2.5 }}>
              Review rhythm
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.7 }}>
              Treat notifications as an inbox for new opportunities. Review, follow up from the
              submissions page, then mark items read when they are handled.
            </Typography>
            <Chip
              label={`${items.length} new`}
              color={items.length > 0 ? 'secondary' : 'default'}
              sx={{ mt: 2.5, alignSelf: 'flex-start' }}
            />
          </AccountPanel>
        </Grid>
      </Grid>
    </>
  );
};

export default Notifications;
