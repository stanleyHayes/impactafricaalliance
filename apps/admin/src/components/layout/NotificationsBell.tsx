import { SubmissionStatus, SubmissionType } from '@iaa/shared';
import type { Submission, SubmissionType as SubmissionTypeT } from '@iaa/shared';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import { alpha } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import type { ComponentType, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useNewSubmissionCounts, useUpdateSubmissionStatus } from '../../lib/admin-hooks';
import { formatUtcShort } from '../../lib/date';
import { usePreferences } from '../../lib/preferences';

type Tint = 'primary' | 'secondary' | 'info';

interface TypeMeta {
  Icon: ComponentType<{ fontSize?: 'small' | 'inherit' | 'large' | 'medium' }>;
  label: string;
  tint: Tint;
}

const TYPE_META: Record<SubmissionTypeT, TypeMeta> = {
  [SubmissionType.Contact]: { Icon: EmailOutlinedIcon, label: 'Contact', tint: 'primary' },
  [SubmissionType.Partner]: { Icon: HandshakeOutlinedIcon, label: 'Partner', tint: 'secondary' },
  [SubmissionType.Volunteer]: { Icon: VolunteerActivismIcon, label: 'Volunteer', tint: 'info' },
  [SubmissionType.Job]: { Icon: WorkOutlineOutlinedIcon, label: 'Job', tint: 'info' },
};

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

/** Primary display line pulled from the free-form submission payload. */
const titleOf = (payload: Record<string, unknown>): string =>
  str(payload.name) ?? str(payload.organizationName) ?? str(payload.email) ?? 'New submission';

/** Supporting line: subject / interest / expertise, then email or message. */
const subtitleOf = (payload: Record<string, unknown>): string | undefined =>
  str(payload.subject) ??
  str(payload.partnershipInterest) ??
  str(payload.expertise) ??
  str(payload.email) ??
  str(payload.message);

/** Compact relative time (e.g. "5m ago", "3h ago", "2d ago"). */
const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return '';
  }
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return formatUtcShort(iso);
};

/**
 * Navbar bell. Badge reflects new (unread) submissions (gated by prefs); clicking
 * opens a rich popover with the latest few, type-tagged, with inline "mark read"
 * and a "View all" footer.
 */
export const NotificationsBell = (): JSX.Element => {
  const navigate = useNavigate();
  const { prefs } = usePreferences();
  // One live query drives the bell, the sidebar badges and the dashboard
  // banner, so the three can never disagree about how much is waiting.
  const { data } = useNewSubmissionCounts();
  const markRead = useUpdateSubmissionStatus();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const items: Submission[] = data?.items ?? [];
  const total = data?.total ?? items.length;
  const count = prefs.showNotificationBadge ? total : 0;
  const recent = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const close = (): void => setAnchorEl(null);

  const viewAll = (): void => {
    close();
    navigate('/account/notifications');
  };

  const handleMarkRead = (event: MouseEvent, id: string): void => {
    event.stopPropagation();
    markRead.mutate({ id, status: SubmissionStatus.Read });
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          id="admin-notifications-button"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label={`Notifications${count ? `, ${count} new` : ''}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          sx={{
            color: open ? 'text.primary' : 'text.secondary',
            bgcolor: open ? (t) => alpha(t.palette.primary.main, 0.08) : 'transparent',
            '&:hover': {
              color: 'text.primary',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            },
          }}
        >
          <Badge
            badgeContent={count}
            color="error"
            max={99}
            overlap="circular"
            sx={{ '& .MuiBadge-badge': { fontWeight: 700, fontSize: '0.625rem' } }}
          >
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              mt: 1.25,
              width: 364,
              maxWidth: '92vw',
              borderRadius: 2.5,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              boxShadow: '0 12px 32px rgba(26, 92, 56, 0.14)',
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 1,
            background: (t) =>
              `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.08)}, ${alpha(
                t.palette.primary.main,
                0,
              )})`,
          }}
        >
          <Typography
            sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}
          >
            Notifications
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {total} new
          </Typography>
        </Box>
        <Divider />

        {recent.length === 0 ? (
          <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                mx: 'auto',
                mb: 1.5,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: 'text.primary',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
              }}
            >
              <DoneAllIcon />
            </Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
              You&apos;re all caught up
            </Typography>
            <Typography variant="caption" color="text.secondary">
              New submissions will appear here.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 392, overflowY: 'auto', py: 0.5 }}>
            {recent.map((item) => {
              const meta = TYPE_META[item.type];
              const { Icon } = meta;
              const subtitle = subtitleOf(item.payload);
              return (
                <Box
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={viewAll}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      viewAll();
                    }
                  }}
                  sx={{
                    px: 2,
                    py: 1.25,
                    display: 'flex',
                    gap: 1.5,
                    cursor: 'pointer',
                    alignItems: 'flex-start',
                    transition: (t) => t.transitions.create('background-color'),
                    '&:hover': { bgcolor: 'action.hover' },
                    '&:hover .iaa-notif-action': { opacity: 1 },
                    '&:focus-visible': { outline: 'none', bgcolor: 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      mt: 0.25,
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'text.secondary',
                      bgcolor: (t) => alpha(t.palette[meta.tint].main, 0.12),
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography
                        noWrap
                        sx={{ fontWeight: 600, fontSize: '0.85rem', flexGrow: 1, minWidth: 0 }}
                      >
                        {titleOf(item.payload)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        {relativeTime(item.createdAt)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                      }}
                    >
                      {meta.label}
                    </Typography>
                    {subtitle && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.25,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontSize: '0.8rem',
                        }}
                      >
                        {subtitle}
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title="Mark as read">
                    <IconButton
                      className="iaa-notif-action"
                      size="small"
                      aria-label="Mark as read"
                      disabled={markRead.isPending}
                      onClick={(event) => handleMarkRead(event, item.id)}
                      sx={{
                        mt: 0.25,
                        flexShrink: 0,
                        color: 'text.secondary',
                        opacity: { xs: 1, sm: 0 },
                        transition: (t) => t.transitions.create('opacity'),
                        '&:hover': { color: 'text.primary' },
                      }}
                    >
                      <MarkEmailReadOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        )}

        <Divider />
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            onClick={viewAll}
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              borderRadius: 1.5,
              '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
            }}
          >
            View all
          </Button>
        </Box>
      </Popover>
    </>
  );
};
