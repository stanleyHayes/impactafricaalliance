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
import { useEffect, useRef, useState } from 'react';

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
import { surfaceSx } from '../../theme/surfaces';

type Editing = { id: string | null; draft: MilestoneDraft } | null;

type Offset = -1 | 1;

/** A move whose arrow had focus, to put focus back once the new order is on screen. */
interface Refocus {
  id: string;
  offset: Offset;
  /** The list the move was made from; focus is restored once it has been replaced. */
  from: Milestone[];
}

const arrowKey = (id: string, offset: Offset): string => `${id}:${offset === -1 ? 'up' : 'down'}`;

const opposite = (offset: Offset): Offset => (offset === -1 ? 1 : -1);

/**
 * How a row control looks while a change is saving. It is marked
 * `aria-disabled` rather than disabled: a disabled button drops keyboard focus
 * to the page, so someone moving an item two places would have to tab back
 * from the top after every step. This keeps the look of a disabled control,
 * including in the skins that raise icon buttons: flat, with no surface, and
 * no press. Classic's icon buttons have no fill or shadow, so there it is
 * only the colour and the cursor.
 */
const BUSY_SX = {
  '&[aria-disabled="true"]': {
    color: 'action.disabled',
    cursor: 'default',
    backgroundColor: 'transparent',
    boxShadow: 'none',
    '&:hover, &:active': { backgroundColor: 'transparent', boxShadow: 'none' },
  },
} as const;

const statusText = (milestone: Milestone): string =>
  MILESTONE_STATUS_OPTIONS.find((option) => option.value === milestone.status)?.label ??
  milestone.status;

const dueText = (milestone: Milestone): string => {
  if (milestone.status === 'done' && milestone.completedAt) {
    return `Done on ${formatDay(milestone.completedAt)}`;
  }
  return milestone.dueDate ? `Due ${formatDay(milestone.dueDate)}` : 'No due date';
};

interface MilestoneActionsProps {
  milestone: Milestone;
  index: number;
  count: number;
  busy: boolean;
  onEdit: () => void;
  onMove: (offset: Offset) => void;
  onRemove: () => void;
  arrowRef: (offset: Offset) => (node: HTMLButtonElement | null) => void;
}

/**
 * Move, edit and remove for one row. While a change saves they stay focusable
 * and do nothing (see `BUSY_SX`). Only the arrows at the ends of the list are
 * truly disabled, as in the other ordered lists in the console; the tab moves
 * focus to the row's other arrow when a move lands an item at an end.
 */
const MilestoneActions = ({
  milestone,
  index,
  count,
  busy,
  onEdit,
  onMove,
  onRemove,
  arrowRef,
}: MilestoneActionsProps): JSX.Element => {
  const busyProps = { 'aria-disabled': busy || undefined, sx: BUSY_SX };
  return (
    <Stack
      direction="row"
      spacing={0.25}
      sx={{ gridColumn: { xs: '2', md: 'auto' }, justifySelf: { xs: 'start', md: 'end' } }}
    >
      <Tooltip title="Move up">
        <span>
          <IconButton
            ref={arrowRef(-1)}
            size="small"
            aria-label={`Move ${milestone.title} up`}
            onClick={() => onMove(-1)}
            disabled={index === 0}
            {...busyProps}
          >
            <ArrowUpwardRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Move down">
        <span>
          <IconButton
            ref={arrowRef(1)}
            size="small"
            aria-label={`Move ${milestone.title} down`}
            onClick={() => onMove(1)}
            disabled={index === count - 1}
            {...busyProps}
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
          {...busyProps}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Remove">
        <IconButton
          size="small"
          aria-label={`Remove ${milestone.title}`}
          onClick={onRemove}
          {...busyProps}
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

interface MilestoneRowProps extends MilestoneActionsProps {
  canUpdate: boolean;
  onToggle: () => void;
}

const MilestoneRow = ({ canUpdate, onToggle, ...actions }: MilestoneRowProps): JSX.Element => {
  const { milestone, busy } = actions;
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
        borderRadius: 2.5,
        // The skin's card: paper with a divider edge in Classic.
        ...surfaceSx.card,
      }}
    >
      <Checkbox
        checked={done}
        onChange={onToggle}
        // Read-only people cannot tick at all. While a save runs the box stays
        // focusable and ignores presses, like the row's buttons.
        disabled={!canUpdate}
        slotProps={{
          input: {
            'aria-label': `${done ? 'Reopen' : 'Mark done'}: ${milestone.title}`,
            'aria-disabled': busy || undefined,
          },
        }}
        sx={busy ? { mt: -0.5, cursor: 'default' } : { mt: -0.5 }}
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
      {canUpdate && <MilestoneActions {...actions} />}
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

  // Set the moment a quick change starts, before `saving` reaches the screen,
  // so a second press in the same instant is ignored too.
  const inFlight = useRef(false);
  const arrows = useRef(new Map<string, HTMLButtonElement>());
  const [refocus, setRefocus] = useState<Refocus | null>(null);

  // A move re-renders the list in its new order, and a row React moves in
  // the page loses focus; a row moved to an end also has its arrow that way
  // disabled. Either way focus goes back to the moved row's arrows.
  useEffect(() => {
    if (!refocus || refocus.from === milestones) return;
    setRefocus(null);
    const own = arrows.current.get(arrowKey(refocus.id, refocus.offset));
    const target =
      own && !own.disabled
        ? own
        : arrows.current.get(arrowKey(refocus.id, opposite(refocus.offset)));
    target?.focus();
  }, [milestones, refocus]);

  const arrowRef =
    (id: string) =>
    (offset: Offset) =>
    (node: HTMLButtonElement | null): void => {
      if (node) arrows.current.set(arrowKey(id, offset), node);
      else arrows.current.delete(arrowKey(id, offset));
    };

  const isBusy = (): boolean => saving || inFlight.current;

  const apply = async (body: ProjectUpdate): Promise<void> => {
    setError(null);
    try {
      await save(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The change could not be saved.');
      throw cause;
    }
  };
  /**
   * For quick actions whose failure is shown in the tab rather than a dialog.
   * Ignored while another change saves: each one is worked out from the list
   * on screen, so a second press would overwrite the first. Resolves to
   * whether the change was saved.
   */
  const quick = async (body: ProjectUpdate): Promise<boolean> => {
    if (isBusy()) return false;
    inFlight.current = true;
    try {
      await apply(body);
      return true;
    } catch {
      return false;
    } finally {
      inFlight.current = false;
    }
  };

  const move = (milestone: Milestone, offset: Offset): void => {
    if (isBusy()) return;
    const focused = document.activeElement === arrows.current.get(arrowKey(milestone.id, offset));
    if (focused) setRefocus({ id: milestone.id, offset, from: milestones });
    void quick({ milestones: moveMilestone(milestones, milestone.id, offset) }).then((saved) => {
      // Nothing moved, so focus never left the arrow.
      if (!saved) setRefocus(null);
    });
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
                  void quick({ milestones: toggleMilestoneDone(milestones, milestone.id) })
                }
                onEdit={() => {
                  if (!isBusy())
                    setEditing({ id: milestone.id, draft: draftFromMilestone(milestone) });
                }}
                onMove={(offset) => move(milestone, offset)}
                onRemove={() => {
                  if (!isBusy()) setRemoving(milestone);
                }}
                arrowRef={arrowRef(milestone.id)}
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
                <Button onClick={() => void quick({ progressOverride: null })} disabled={saving}>
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
