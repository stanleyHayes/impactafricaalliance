import { formWindowState, type FormDefinition, type FormStatus } from '@iaa/shared';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { DetailSection } from '../../components/detail/DetailSection';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { InformationItem } from '../../components/InformationItem';
import { PageHeader } from '../../components/PageHeader';
import type { ApiError } from '../../lib/api-client';
import { useApplications } from '../../lib/applications';
import {
  formatInstant,
  publicFormUrl,
  useArchiveForm,
  useChangeFormStatus,
  useDeleteForm,
  useDuplicateForm,
  useForm,
  useFormPreview,
} from '../../lib/forms';
import { pageGuides } from '../../lib/page-guides';
import { APPLICATION_STATUS_OPTIONS, FORM_TYPE_OPTIONS } from '../../lib/select-options';
import { backLinkSx, skinned, tokenVar } from '../../theme/surfaces';

import { publishBlockers } from './form-editor-model';
import { FormStatusChip } from './FormStatusChip';

const ADMIN_NOTE =
  'Only an administrator can publish, close or reopen a form, because a published form collects personal data.';

/** Problems a refused request sent back, one per line, or its message alone. */
const errorLines = (error: ApiError | null): string[] => {
  if (!error) return [];
  const details = Array.isArray(error.details) ? (error.details as { message?: unknown }[]) : [];
  const lines = details
    .map((detail) => detail.message)
    .filter((line): line is string => typeof line === 'string');
  return lines.length > 0 ? lines : [error.message];
};

interface StatusMove {
  to: FormStatus;
  label: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'error' | 'default';
}

/** The status changes an administrator can make from where the form is now. */
const movesFor = (form: FormDefinition): StatusMove[] => {
  const url = publicFormUrl(form.slug);
  const name = <strong>{form.title}</strong>;
  const publish: StatusMove = {
    to: 'published',
    label: form.status === 'closed' ? 'Reopen' : 'Publish',
    title: form.status === 'closed' ? 'Reopen this form?' : 'Publish this form?',
    description: (
      <>
        {name} will be public at {url}. Anyone with the link can apply while its dates allow, and
        what they send is personal data the team is responsible for.
      </>
    ),
    confirmLabel: form.status === 'closed' ? 'Reopen' : 'Publish',
  };
  const close: StatusMove = {
    to: 'closed',
    label: 'Close to new applications',
    title: 'Close this form?',
    description: (
      <>
        {name} stops taking applications. Its page stays up and says so, and every application
        already sent is kept.
      </>
    ),
    confirmLabel: 'Close form',
  };
  const toDraft: StatusMove = {
    to: 'draft',
    label: 'Return to draft',
    title: 'Take this form back to draft?',
    description: (
      <>
        {name} loses its public page. Nobody has applied yet, so nothing is lost; anyone part-way
        through can no longer reach their draft.
      </>
    ),
    confirmLabel: 'Return to draft',
    tone: 'error',
  };
  const moves: Record<FormStatus, StatusMove[]> = {
    draft: [publish],
    published: [close],
    closed: [publish],
  };
  const canUnpublish = form.status !== 'draft' && form.submissionCount === 0;
  return [...moves[form.status], ...(canUnpublish ? [toDraft] : [])];
};

/** One sentence on whether the form is taking applications right now. */
const statusSentence = (form: FormDefinition): string => {
  if (form.status === 'draft') return 'No public page yet.';
  if (form.status === 'closed') return 'Not taking applications. The page says so.';
  const sentences: Record<ReturnType<typeof formWindowState>, string> = {
    open: 'Taking applications now.',
    'not-yet-open': `Opens ${formatInstant(form.settings.opensAt)}.`,
    closed: 'Its closing date has passed, so it is not taking applications.',
  };
  return sentences[formWindowState(form.settings, new Date())];
};

const BlockerList = ({ blockers }: { blockers: readonly string[] }): JSX.Element => (
  <Alert severity="warning">
    <AlertTitle>Fix these before publishing</AlertTitle>
    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
      {blockers.map((problem) => (
        <li key={problem}>{problem}</li>
      ))}
    </Box>
  </Alert>
);

/** The buttons an administrator has, each asking before it acts. */
const StatusButtons = ({
  form,
  blockers,
}: {
  form: FormDefinition;
  blockers: readonly string[];
}): JSX.Element => {
  const change = useChangeFormStatus();
  const [pending, setPending] = useState<StatusMove | null>(null);
  const moves = form.archivedAt ? [] : movesFor(form);
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {moves.map((move) => (
          <Button
            key={move.to}
            variant={move.to === 'draft' ? 'text' : 'contained'}
            color={move.tone === 'error' ? 'error' : 'primary'}
            onClick={() => setPending(move)}
            disabled={change.isPending || (move.to === 'published' && blockers.length > 0)}
          >
            {move.label}
          </Button>
        ))}
      </Stack>
      <ConfirmDialog
        open={pending !== null}
        eyebrow="Forms"
        title={pending?.title ?? ''}
        description={pending?.description ?? ''}
        confirmLabel={pending?.confirmLabel ?? ''}
        tone={pending?.tone ?? 'default'}
        pending={change.isPending}
        error={change.isError ? errorLines(change.error).join(' ') : null}
        onConfirm={() => {
          if (pending) {
            change.mutate(
              { id: form.id, status: pending.to },
              { onSuccess: () => setPending(null) },
            );
          }
        }}
        onClose={() => {
          setPending(null);
          change.reset();
        }}
      />
    </>
  );
};

/** Publishing, closing and reopening, for administrators, with what blocks publishing. */
const StatusPanel = ({
  form,
  isAdmin,
}: {
  form: FormDefinition;
  isAdmin: boolean;
}): JSX.Element => {
  const archived = Boolean(form.archivedAt);
  const blockers = publishBlockers({
    title: form.title,
    steps: form.steps,
    opensAt: form.settings.opensAt,
    closesAt: form.settings.closesAt,
  });
  const showBlockers = !archived && form.status !== 'published' && blockers.length > 0;
  return (
    <DetailSection
      title="Status"
      icon={<PublicRoundedIcon />}
      description="Whether the form has a public page, and whether it is taking applications."
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ flexWrap: 'wrap', rowGap: 1 }}
        >
          <FormStatusChip status={form.status} archived={archived} size="medium" />
          <Typography variant="body2" color="text.secondary">
            {statusSentence(form)}
          </Typography>
        </Stack>
        {archived && (
          <Alert severity="info">Restore this form from the archive to change its status.</Alert>
        )}
        {showBlockers && <BlockerList blockers={blockers} />}
        {isAdmin ? (
          <StatusButtons form={form} blockers={blockers} />
        ) : (
          <Alert severity="info" icon={<InfoOutlinedIcon />}>
            {ADMIN_NOTE}
          </Alert>
        )}
      </Stack>
    </DetailSection>
  );
};

/** The public link, to copy into an email or a post. */
const ShareLink = ({ form }: { form: FormDefinition }): JSX.Element => {
  const [copied, setCopied] = useState(false);
  const url = publicFormUrl(form.slug);
  const live = form.status !== 'draft' && !form.archivedAt;
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Some browsers refuse clipboard access; the link is on screen to copy by hand.
    }
  };
  return (
    <DetailSection
      title="Share link"
      icon={<LinkRoundedIcon />}
      description={
        live
          ? 'Send this to the people you want to apply.'
          : 'The link works once the form is published.'
      }
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField
          value={url}
          label="Public link"
          size="small"
          fullWidth
          slotProps={{ htmlInput: { readOnly: true } }}
          onFocus={(event) => event.target.select()}
        />
        <Stack direction="row" spacing={1}>
          <Button startIcon={<ContentCopyRoundedIcon />} onClick={() => void copy()}>
            Copy
          </Button>
          {live && (
            <Button
              component="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNewRoundedIcon />}
            >
              Open
            </Button>
          )}
        </Stack>
      </Stack>
      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        message="Link copied"
      />
    </DetailSection>
  );
};

const FormSummary = ({ form }: { form: FormDefinition }): JSX.Element => {
  const questions = form.steps.reduce((total, step) => total + step.fields.length, 0);
  const type = FORM_TYPE_OPTIONS.find((option) => option.value === form.type)?.label;
  return (
    <DetailSection title="At a glance" icon={<DynamicFormIcon />}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <InformationItem label="Type">{type}</InformationItem>
        <InformationItem label="Applications">{form.submissionCount}</InformationItem>
        <InformationItem label="Opens">
          {form.settings.opensAt ? formatInstant(form.settings.opensAt) : 'When published'}
        </InformationItem>
        <InformationItem label="Closes">
          {form.settings.closesAt ? formatInstant(form.settings.closesAt) : 'No closing date'}
        </InformationItem>
        <InformationItem label="Most applications">
          {form.settings.submissionLimit ?? 'No limit'}
        </InformationItem>
        <InformationItem label="Save and come back">
          {form.settings.allowDrafts ? 'Allowed' : 'Off: answers are sent in one go'}
        </InformationItem>
        <InformationItem label="Questions">
          {questions} across {form.steps.length} {form.steps.length === 1 ? 'step' : 'steps'}
        </InformationItem>
        <InformationItem label="Version">
          {form.version}
          {form.publishedAt ? `, live since ${formatInstant(form.publishedAt)}` : ''}
        </InformationItem>
        <InformationItem label="Created">
          {formatInstant(form.createdAt)}
          {form.createdBy ? ` by ${form.createdBy.name}` : ''}
        </InformationItem>
        <InformationItem label="Last updated">
          {formatInstant(form.updatedAt)}
          {form.updatedBy ? ` by ${form.updatedBy.name}` : ''}
        </InformationItem>
      </Box>
      {form.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
          Note for the team: {form.description}
        </Typography>
      )}
    </DetailSection>
  );
};

const statusLabel = (status: string): string =>
  APPLICATION_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

/** The latest applications, for those who may read them. */
const RecentApplications = ({ formId }: { formId: string }): JSX.Element | null => {
  const can = useCan();
  const allowed = can('read', 'applications');
  const query = useApplications({ formId, page: 1, pageSize: 5 }, allowed);
  if (!allowed) return null;
  const body = (): ReactNode => {
    if (query.isPending) {
      return (
        <Stack spacing={1}>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} variant="rounded" height={48} />
          ))}
        </Stack>
      );
    }
    if (query.isError) {
      return (
        <Alert
          severity="error"
          action={<Button onClick={() => void query.refetch()}>Retry</Button>}
        >
          {query.error.message || 'The applications could not be loaded.'}
        </Alert>
      );
    }
    if (query.data.items.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Applications sent through this form appear here.
        </Typography>
      );
    }
    return (
      <List disablePadding>
        {query.data.items.map((item) => (
          <ListItemButton key={item.id} component={RouterLink} to={`/applications/${item.id}`}>
            <ListItemText
              primary={item.applicant.name ?? item.reference}
              secondary={`${item.reference} · ${statusLabel(item.status)} · ${formatInstant(item.submittedAt)}`}
            />
          </ListItemButton>
        ))}
      </List>
    );
  };
  return (
    <DetailSection
      title="Recent applications"
      icon={<AssignmentIndOutlinedIcon />}
      action={
        <Button component={RouterLink} to={`/applications?formId=${formId}`} size="small">
          See all
        </Button>
      }
    >
      {body()}
    </DetailSection>
  );
};

const DuplicateButton = ({ form }: { form: FormDefinition }): JSX.Element => {
  const navigate = useNavigate();
  const duplicate = useDuplicateForm();
  return (
    <>
      <Button
        startIcon={<ContentCopyRoundedIcon />}
        onClick={() =>
          duplicate.mutate(form.id, { onSuccess: (copy) => navigate(`/forms/${copy.id}`) })
        }
        disabled={duplicate.isPending}
      >
        {duplicate.isPending ? 'Duplicating…' : 'Duplicate'}
      </Button>
      {duplicate.isError && <Alert severity="error">{duplicate.error.message}</Alert>}
    </>
  );
};

/** Archive or restore. A live form is closed by an administrator first. */
const ArchiveButton = ({ form }: { form: FormDefinition }): JSX.Element => {
  const archive = useArchiveForm();
  const archived = Boolean(form.archivedAt);
  const live = !archived && form.status === 'published';
  return (
    <>
      <Button
        startIcon={archived ? <UnarchiveOutlinedIcon /> : <ArchiveOutlinedIcon />}
        onClick={() => archive.mutate({ id: form.id, archived: !archived })}
        disabled={archive.isPending || live}
      >
        {archived ? 'Restore from archive' : 'Archive'}
      </Button>
      {live && (
        <Typography variant="body2" color="text.secondary">
          A published form is closed by an administrator before it can be archived.
        </Typography>
      )}
      {archive.isError && <Alert severity="error">{archive.error.message}</Alert>}
    </>
  );
};

/** Delete, only while nobody has applied; the applications are never deleted from here. */
const DeleteButton = ({ form }: { form: FormDefinition }): JSX.Element => {
  const navigate = useNavigate();
  const remove = useDeleteForm();
  const [confirming, setConfirming] = useState(false);
  if (form.submissionCount > 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        People have applied through this form, so it cannot be deleted. Close or archive it instead;
        the applications stay.
      </Typography>
    );
  }
  return (
    <>
      <Button
        color="error"
        startIcon={<DeleteOutlineRoundedIcon />}
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
      <ConfirmDialog
        open={confirming}
        tone="error"
        eyebrow="Forms"
        title="Delete this form?"
        description={
          <>
            <strong>{form.title}</strong>, its saved versions and any unfinished drafts will be
            deleted. This cannot be undone.
          </>
        }
        confirmLabel="Delete form"
        pending={remove.isPending}
        error={remove.isError ? remove.error.message : null}
        onConfirm={() => remove.mutate(form.id, { onSuccess: () => navigate('/forms') })}
        onClose={() => setConfirming(false)}
      />
    </>
  );
};

/** Duplicate, archive or restore, and delete while nobody has applied. */
const OtherActions = ({ form }: { form: FormDefinition }): JSX.Element | null => {
  const can = useCan();
  const actions = [
    can('create', 'forms') && <DuplicateButton key="duplicate" form={form} />,
    can('update', 'forms') && <ArchiveButton key="archive" form={form} />,
    can('delete', 'forms') && <DeleteButton key="delete" form={form} />,
  ].filter(Boolean);
  if (actions.length === 0) return null;
  return (
    <DetailSection title="More" icon={<ArchiveOutlinedIcon />}>
      <Stack spacing={1.5} alignItems="flex-start">
        {actions}
      </Stack>
    </DetailSection>
  );
};

/** Edit and Preview, the two things done most often. */
const HeaderActions = ({ form }: { form: FormDefinition }): JSX.Element => {
  const can = useCan();
  const preview = useFormPreview();
  const [error, setError] = useState('');
  const openPreview = (): void => {
    // Opened now, while the click still counts, so a popup blocker lets it
    // through; it is pointed at the preview once the link arrives.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    setError('');
    preview.mutate(form.id, {
      onSuccess: (link) => {
        if (tab) tab.location.replace(link.url);
        else window.location.assign(link.url);
      },
      onError: (failure) => {
        tab?.close();
        setError(failure.message || 'The preview could not be opened.');
      },
    });
  };
  return (
    <Stack spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="outlined"
          startIcon={<VisibilityOutlinedIcon />}
          onClick={openPreview}
          disabled={preview.isPending}
        >
          {preview.isPending ? 'Opening…' : 'Preview'}
        </Button>
        {can('update', 'forms') && (
          <Button
            variant="contained"
            component={RouterLink}
            to={`/forms/${form.id}/edit`}
            startIcon={<EditRoundedIcon />}
          >
            Edit
          </Button>
        )}
      </Stack>
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
};

/**
 * A loading section's header strip. Classic leaves it plain; the other skins
 * give it the tint DetailSection's header has there, so the page does not
 * change colour when the form arrives.
 */
const SKELETON_HEADER_SX = skinned(
  { px: { xs: 2.5, md: 3.5 }, py: 2.5, borderBottom: 1, borderColor: 'divider' },
  { bgcolor: tokenVar('surfaceTintBg') },
);

/** One section's outline while it loads: the tinted header, then `children`. */
const SectionSkeleton = ({ children }: { children: ReactNode }): JSX.Element => (
  <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
    <Stack direction="row" spacing={1.5} alignItems="center" sx={SKELETON_HEADER_SX}>
      <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 2 }} />
      <Skeleton variant="text" width="40%" sx={{ fontSize: '1.1rem' }} />
    </Stack>
    <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>{children}</Box>
  </Card>
);

/**
 * The page's own shape while the form loads: status, share link and the
 * summary grid on the left; recent applications and the other actions on the
 * right, stacking into one column on small screens as the page does.
 */
const DetailSkeleton = (): JSX.Element => (
  <Box
    aria-busy="true"
    aria-label="Loading the form"
    sx={{
      display: 'grid',
      gap: 3,
      gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' },
      alignItems: 'start',
    }}
  >
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <SectionSkeleton>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Skeleton variant="rounded" width={96} height={32} sx={{ borderRadius: 4 }} />
          <Skeleton variant="text" width="45%" />
        </Stack>
        <Skeleton variant="rounded" width={140} height={36} />
      </SectionSkeleton>
      <SectionSkeleton>
        <Skeleton variant="rounded" height={40} />
      </SectionSkeleton>
      <SectionSkeleton>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {Array.from({ length: 6 }, (_, index) => (
            <Box key={index}>
              <Skeleton variant="text" width="35%" />
              <Skeleton variant="text" width="65%" />
            </Box>
          ))}
        </Box>
      </SectionSkeleton>
    </Stack>
    <Stack spacing={3} sx={{ minWidth: 0 }}>
      <SectionSkeleton>
        <Stack spacing={1}>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} variant="rounded" height={48} />
          ))}
        </Stack>
      </SectionSkeleton>
      <SectionSkeleton>
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" width={120} height={32} />
          <Skeleton variant="rounded" width={100} height={32} />
        </Stack>
      </SectionSkeleton>
    </Stack>
  </Box>
);

/**
 * One form (plan §4.3): its status and schedule, the share link, a preview of
 * the real public page, publishing for administrators, and the latest
 * applications.
 */
const FormDetailPage = (): JSX.Element => {
  const { formId } = useParams();
  const { user } = useAuth();
  const query = useForm(formId);
  const form = query.data;

  if (query.isPending) {
    return (
      <>
        <PageHeader title="Form" icon={<DynamicFormIcon />} help={pageGuides['form-detail']} />
        <DetailSkeleton />
      </>
    );
  }
  if (!form) {
    const missing = query.error?.status === 404;
    return (
      <Stack spacing={2}>
        <PageHeader title="Form" icon={<DynamicFormIcon />} help={pageGuides['form-detail']} />
        <Alert
          severity="error"
          action={missing ? undefined : <Button onClick={() => void query.refetch()}>Retry</Button>}
        >
          {missing
            ? 'This form could not be found. It may have been deleted.'
            : query.error?.message || 'The form could not be loaded.'}
        </Alert>
        <Box>
          <Button
            component={RouterLink}
            to="/forms"
            startIcon={<ArrowBackRoundedIcon />}
            sx={backLinkSx}
          >
            All forms
          </Button>
        </Box>
      </Stack>
    );
  }

  return (
    <>
      <PageHeader
        title={form.title}
        description={`${FORM_TYPE_OPTIONS.find((option) => option.value === form.type)?.label ?? 'Form'} · /apply/${form.slug}`}
        icon={<DynamicFormIcon />}
        help={pageGuides['form-detail']}
        count={form.submissionCount}
        action={<HeaderActions form={form} />}
      />
      <Box sx={{ mb: 2 }}>
        <Button
          component={RouterLink}
          to="/forms"
          startIcon={<ArrowBackRoundedIcon />}
          sx={backLinkSx}
        >
          All forms
        </Button>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' },
          alignItems: 'start',
        }}
      >
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <StatusPanel form={form} isAdmin={user?.role === 'admin'} />
          <ShareLink form={form} />
          <FormSummary form={form} />
        </Stack>
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <RecentApplications formId={form.id} />
          <OtherActions form={form} />
        </Stack>
      </Box>
    </>
  );
};

export default FormDetailPage;
