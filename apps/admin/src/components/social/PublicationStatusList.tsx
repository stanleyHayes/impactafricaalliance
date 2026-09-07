import { DESTINATION_CAPABILITIES, UserRole, type SocialPublication } from '@iaa/shared';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAuth } from '../../auth/AuthContext';
import {
  useApprovePublication,
  useCancelPublication,
  useRejectPublication,
  useRetryPublication,
  useSocialPublications,
} from '../../lib/social-publishing';

const STATUS_COLOUR: Record<
  SocialPublication['status'],
  'default' | 'info' | 'success' | 'error' | 'warning'
> = {
  draft: 'default',
  pending_approval: 'warning',
  queued: 'info',
  processing: 'info',
  published: 'success',
  failed: 'error',
  cancelled: 'warning',
};

const when = (publication: SocialPublication): string => {
  if (publication.rejectedAt) {
    return `Declined ${new Date(publication.rejectedAt).toLocaleString('en-GB')}`;
  }
  if (publication.publishedAt) {
    return `Published ${new Date(publication.publishedAt).toLocaleString('en-GB')}`;
  }
  if (publication.scheduledFor) {
    return `Scheduled for ${new Date(publication.scheduledFor).toLocaleString('en-GB')}`;
  }
  return `Queued ${new Date(publication.createdAt).toLocaleString('en-GB')}`;
};

/**
 * Every destination's own outcome.
 *
 * Deliberately one row per destination rather than one per article: a post
 * that reached LinkedIn and failed on Instagram is a partial success, and
 * showing it as a single failed article would invite someone to send the
 * whole thing again and duplicate the LinkedIn post.
 */
export const PublicationStatusList = ({ articleId }: { articleId?: string }): JSX.Element => {
  const { data, isLoading } = useSocialPublications(articleId);
  const { user } = useAuth();
  const retry = useRetryPublication();
  const cancel = useCancelPublication();
  const approve = useApprovePublication();
  const reject = useRejectPublication();
  const canApprove = user?.role === UserRole.Admin;

  if (isLoading) {
    return <Typography color="text.secondary">Loading publications…</Typography>;
  }
  const items = data ?? [];
  if (items.length === 0) {
    return (
      <Typography color="text.secondary">
        Nothing has been sent to social media yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      {items.map((publication) => {
        const capability = DESTINATION_CAPABILITIES[publication.destination];
        const settled = publication.status === 'published';
        // Retry is for something that tried and failed. A held publication has
        // not tried yet, and the API refuses it — so offering the button would
        // only ever produce an error.
        const retryable =
          !settled &&
          publication.status !== 'cancelled' &&
          publication.status !== 'pending_approval';
        return (
          <Box
            key={publication.id}
            sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              useFlexGap
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 650 }}>{capability.label}</Typography>
                <Chip
                  size="small"
                  label={publication.status}
                  color={STATUS_COLOUR[publication.status]}
                />
                {publication.retryCount > 0 && (
                  <Chip size="small" variant="outlined" label={`${publication.retryCount} tries`} />
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                {publication.externalPostUrl && (
                  <Link
                    href={publication.externalPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    View post <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                )}
                {/* Approval is per destination too: an administrator can
                    release the LinkedIn post and decline the Instagram one. */}
                {publication.status === 'pending_approval' && canApprove && (
                  <>
                    <Button
                      size="small"
                      startIcon={<CheckRoundedIcon />}
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(publication.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      disabled={reject.isPending}
                      onClick={() => {
                        const reason = window.prompt('Why is this being declined?')?.trim();
                        if (reason) {
                          reject.mutate({ id: publication.id, reason });
                        }
                      }}
                    >
                      Decline
                    </Button>
                  </>
                )}
                {publication.status === 'pending_approval' && !canApprove && (
                  <Typography variant="caption" color="text.secondary">
                    Waiting for an administrator
                  </Typography>
                )}
                {/* Retry is offered per destination, so the ones that worked
                    are never sent a second time. */}
                {retryable && (
                  <Button
                    size="small"
                    startIcon={<ReplayRoundedIcon />}
                    disabled={retry.isPending}
                    onClick={() => retry.mutate(publication.id)}
                  >
                    Retry
                  </Button>
                )}
                {(publication.status === 'queued' || publication.status === 'failed') && (
                  <Button
                    size="small"
                    color="inherit"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(publication.id)}
                  >
                    Cancel
                  </Button>
                )}
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {when(publication)}
            </Typography>
            {publication.rejectionReason && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Declined: {publication.rejectionReason}
              </Alert>
            )}
            {publication.errorMessage && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {publication.errorMessage}
              </Alert>
            )}
          </Box>
        );
      })}
    </Stack>
  );
};

export default PublicationStatusList;
