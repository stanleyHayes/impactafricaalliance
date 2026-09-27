import type { Milestone, ProjectUpdate } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { DetailSection } from '../../components/detail/DetailSection';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import {
  draftFromMilestone,
  emptyMilestoneDraft,
  moveMilestone,
  overrideDraftFrom,
  removeMilestone,
  saveMilestoneDraft,
  toggleMilestoneDone,
  type MilestoneDraft,
} from '../../components/projects/milestones';
import { formatDay } from '../../components/projects/project-format';
import { MilestoneDialog, ProgressOverrideDialog } from '../../components/projects/ProjectDialogs';
import { ProjectProgressBar } from '../../components/projects/ProjectProgressBar';
import { READ_ONLY_NOTE, useProjectPlanEditing } from '../../components/projects/useProjectOutlet';
import { MILESTONE_STATUS_OPTIONS } from '../../lib/select-options';

type Editing = { id: string | null; draft: MilestoneDraft } | null;

const statusText = (milestone: Milestone): string =>
  MILESTONE_STATUS_OPTIONS.find((option) => option.value === milestone.status)?.label ??
  milestone.status;

const dueText = (milestone: Milestone): string => {
  if (milestone.status === 'done' && milestone.completedAt) {
    return `Done on ${formatDay(milestone.completedAt)}`;
  }
  return milestone.dueDate ? `Due ${formatDay(milestone.dueDate)}` : 'No due date';
};

interface MilestoneRowProps {
  milestone: Milestone;
  index: number;
  count: number;
  canUpdate: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}

const MilestoneRow = ({
  milestone,
  index,
  count,
  canUpdate,
  busy,
  onToggle,
  onEdit,
  onMove,
  onRemove,
}: MilestoneRowProps): JSX.Element => {
  const done = milestone.status === 'done';
  const kind = milestone.kind === 'activity' ? 'Activity' : 'Milestone';
  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', md: 'auto minmax(0, 1fr) auto' },
        gap: 1.5,
        alignItems: 'start',
        p: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2.5,
        bgcolor: 'background.paper',
      }}
    >
      <Checkbox
        checked={done}
        onChange={onToggle}
        disabled={!canUpdate || busy}
        slotProps={{
          input: { 'aria-label': `${done ? 'Reopen' : 'Mark done'}: ${milestone.title}` },
        }}
        sx={{ mt: -0.5 }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          {milestone.kind === 'activity' ? (
            <HandymanOutlinedIcon fontSize="small" aria-hidden sx={{ color: 'text.secondary' }} />
          ) : (
            <FlagOutlinedIcon fontSize="small" aria-hidden sx={{ color: 'text.secondary' }} />
          )}
          <Typography
            sx={{
              fontWeight: 700,
              textDecoration: done ? 'line-through' : 'none',
              color: done ? 'text.secondary' : 'text.primary',
            }}
          >
            {milestone.title}
          </Typography>
          <Chip size="small" variant="outlined" label={kind} />
          <Chip size="small" color={done ? 'success' : 'default'} label={statusText(milestone)} />
        </Stack>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          {dueText(milestone)}
        </Typography>
        {milestone.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {milestone.description}
          </Typography>
        )}
      </Box>
      {canUpdate && (
        <Stack
          direction="row"
          spacing={0.25}
          sx={{ gridColumn: { xs: '2', md: 'auto' }, justifySelf: { xs: 'start', md: 'end' } }}
        >
          <Tooltip title="Move up">
            <span>
              <IconButton
                size="small"
                aria-label={`Move ${milestone.title} up`}
                onClick={() => onMove(-1)}
                disabled={busy || index === 0}
              >
                <ArrowUpwardRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move down">
            <span>
              <IconButton
                size="small"
                aria-label={`Move ${milestone.title} down`}
                onClick={() => onMove(1)}
                disabled={busy || index === count - 1}
              >
                <ArrowDownwardRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              aria-label={`Edit ${milestone.title}`}
              onClick={onEdit}
              disabled={busy}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton
              size="small"
              aria-label={`Remove ${milestone.title}`}
              onClick={onRemove}
              disabled={busy}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </Box>
  );
};

/**
 * The project's Milestones & activities tab: the plan in order, ticked off as
 * it happens, and the progress figure that counts it (or a figure set by
 * hand, said as such). Every change saves the list at once.
 */
const ProjectMilestonesTab = (): JSX.Element => {
  const { project, canUpdate, save, saving } = useProjectPlanEditing();
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<Milestone | null>(null);
  const [overriding, setOverriding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const milestones = project.milestones;
  const manual = project.progress.source === 'manual';
  const counted = `${project.progress.done} of ${project.progress.total} done`;

  const apply = async (body: ProjectUpdate): Promise<void> => {
    setError(null);
    try {
      await save(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The change could not be saved.');
      throw cause;
    }
  };
  // For quick actions whose failure is shown in the tab rather than a dialog.
  const quick = (body: ProjectUpdate): void => {
    void apply(body).catch(() => undefined);
  };

  return (
    <Stack spacing={3}>
      {!canUpdate && <Alert severity="info">{READ_ONLY_NOTE}</Alert>}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <DetailSection
        title="Milestones & activities"
        icon={<FlagOutlinedIcon />}
        description="Checkpoints with a date, and the delivery work between them, in order."
        action={
          canUpdate ? (
            <Button
              startIcon={<AddRoundedIcon />}
              onClick={() => setEditing({ id: null, draft: emptyMilestoneDraft() })}
              disabled={saving}
            >
              Add
            </Button>
          ) : undefined
        }
      >
        {milestones.length === 0 ? (
          <EmptyState
            compact
            icon={<FlagOutlinedIcon />}
            title="No milestones or activities yet"
            description="Add the checkpoints and pieces of work that make up the plan. Each one done moves the progress on."
            primaryAction={
              canUpdate
                ? {
                    label: 'Add a milestone',
                    icon: <AddRoundedIcon />,
                    onClick: () => setEditing({ id: null, draft: emptyMilestoneDraft() }),
                  }
                : undefined
            }
          />
        ) : (
          <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
            {milestones.map((milestone, index) => (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                index={index}
                count={milestones.length}
                canUpdate={canUpdate}
                busy={saving}
                onToggle={() =>
                  quick({ milestones: toggleMilestoneDone(milestones, milestone.id) })
                }
                onEdit={() =>
                  setEditing({ id: milestone.id, draft: draftFromMilestone(milestone) })
                }
                onMove={(offset) =>
                  quick({ milestones: moveMilestone(milestones, milestone.id, offset) })
                }
                onRemove={() => setRemoving(milestone)}
              />
            ))}
          </Box>
        )}
      </DetailSection>

      <DetailSection
        title="Progress"
        icon={<InsightsOutlinedIcon />}
        description="Finished tasks and milestones over all of them, unless a figure has been set by hand."
      >
        <Stack spacing={2}>
          <Box sx={{ maxWidth: 560 }}>
            <ProjectProgressBar progress={project.progress} />
          </Box>
          {manual && (
            <Alert severity="warning">
              This figure was set by hand and is not a count. Counting finished work would give{' '}
              {counted}.
            </Alert>
          )}
          {canUpdate && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Button variant="outlined" onClick={() => setOverriding(true)} disabled={saving}>
                {manual ? 'Change the figure' : 'Set progress by hand'}
              </Button>
              {manual && (
                <Button onClick={() => quick({ progressOverride: null })} disabled={saving}>
                  Go back to counting work
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      </DetailSection>

      {editing && (
        <MilestoneDialog
          open
          initial={editing.draft}
          editing={editing.id !== null}
          onSave={(draft) =>
            save({ milestones: saveMilestoneDraft(milestones, draft, editing.id) })
          }
          onClose={() => setEditing(null)}
        />
      )}
      {overriding && (
        <ProgressOverrideDialog
          open
          initial={overrideDraftFrom(project.progressOverride)}
          countedText={counted}
          onSave={(override) => save({ progressOverride: override })}
          onClose={() => setOverriding(false)}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        tone="error"
        eyebrow="Projects"
        title="Remove this item?"
        description={
          <>
            <strong>{removing?.title}</strong> will be removed from the plan. Tasks linked to it
            keep their place in the project.
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        pending={saving}
        error={error}
        onConfirm={() => {
          if (!removing) return;
          void apply({ milestones: removeMilestone(milestones, removing.id) })
            .then(() => setRemoving(null))
            .catch(() => undefined);
        }}
        onClose={() => setRemoving(null)}
      />
    </Stack>
  );
};

export default ProjectMilestonesTab;
