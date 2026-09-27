import type {
  MilestoneKind,
  MilestoneStatus,
  ProjectMediaUpdate,
  ProjectProgressOverride,
  RiskLevel,
  RiskStatus,
} from '@iaa/shared';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import PhotoOutlinedIcon from '@mui/icons-material/PhotoOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { useState, type FormEvent, type ReactNode } from 'react';

import {
  MILESTONE_KIND_OPTIONS,
  MILESTONE_STATUS_OPTIONS,
  RISK_LEVEL_OPTIONS,
  RISK_STATUS_OPTIONS,
} from '../../lib/select-options';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';
import { DateField } from '../fields/DateField';
import { OptionSelect } from '../fields/OptionSelect';

import { parseMetricDraft, parseRiskDraft, type MetricDraft, type RiskDraft } from './impact-items';
import {
  milestoneDraftErrors,
  parseOverrideDraft,
  type MilestoneDraft,
  type MilestoneDraftErrors,
  type OverrideDraft,
} from './milestones';

/** Why a save failed, from the API's message. */
const messageOf = (cause: unknown, fallback: string): string =>
  cause instanceof Error && cause.message ? cause.message : fallback;

interface FormDialogProps {
  open: boolean;
  title: string;
  description?: string;
  icon: ReactNode;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A short form in a dialog, five fields at most (AGENTS.md). Enter submits,
 * because there is only one step; closing is refused while it saves so a
 * save cannot be abandoned half way.
 */
const FormDialog = ({
  open,
  title,
  description,
  icon,
  submitLabel,
  pending,
  error,
  onSubmit,
  onClose,
  children,
}: FormDialogProps): JSX.Element => {
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!pending) onSubmit();
  };
  const close = (): void => {
    if (!pending) onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: dialogPaperSx, 'aria-label': title } }}
    >
      <Box component="form" noValidate onSubmit={submit}>
        <DialogHeader
          icon={icon}
          eyebrow="Projects"
          title={title}
          description={description}
          onClose={close}
        />
        <DialogContent sx={{ py: 3 }}>
          <Stack spacing={2.5} sx={{ pt: 0.5 }}>
            {children}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogFooter>
          <Button onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </DialogFooter>
      </Box>
    </Dialog>
  );
};

/**
 * Runs a dialog's save and keeps its own error, so a refused save leaves the
 * dialog open with what was typed.
 */
const useDialogSave = (fallback: string) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (save: () => Promise<unknown>, onDone: () => void): Promise<void> => {
    setPending(true);
    setError(null);
    try {
      await save();
      onDone();
    } catch (cause) {
      setError(messageOf(cause, fallback));
    } finally {
      setPending(false);
    }
  };
  return { pending, error, run, clearError: () => setError(null) };
};

export interface MilestoneDialogProps {
  open: boolean;
  /** The item being edited, or null for a new one. */
  initial: MilestoneDraft;
  editing: boolean;
  onSave: (draft: MilestoneDraft) => Promise<unknown>;
  onClose: () => void;
}

/** Adding or editing one milestone or activity: kind, title, due date, status, description. */
export const MilestoneDialog = ({
  open,
  initial,
  editing,
  onSave,
  onClose,
}: MilestoneDialogProps): JSX.Element => {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<MilestoneDraftErrors>({});
  // The due date field's own objection; it keeps the old day rather than pass
  // on a half-typed one, so Enter must wait rather than save that old day.
  const [dateProblem, setDateProblem] = useState<string | null>(null);
  const save = useDialogSave('The milestone could not be saved. Try again.');
  const set = <K extends keyof MilestoneDraft>(key: K, value: MilestoneDraft[K]): void => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };
  const submit = (): void => {
    const problems = milestoneDraftErrors(draft);
    setErrors(problems);
    if (Object.keys(problems).length === 0 && !dateProblem) {
      void save.run(() => onSave(draft), onClose);
    }
  };
  return (
    <FormDialog
      open={open}
      title={editing ? 'Edit milestone or activity' : 'Add a milestone or activity'}
      description="A milestone is a checkpoint with a date; an activity is a piece of delivery work."
      icon={<FlagOutlinedIcon />}
      submitLabel={editing ? 'Save changes' : 'Add'}
      pending={save.pending}
      error={save.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <OptionSelect
        label="Kind"
        options={MILESTONE_KIND_OPTIONS}
        value={draft.kind}
        onChange={(value) => set('kind', value as MilestoneKind)}
        disabled={save.pending}
      />
      <TextField
        label="Title"
        required
        autoFocus
        value={draft.title}
        onChange={(event) => set('title', event.target.value)}
        error={Boolean(errors.title)}
        helperText={errors.title}
        slotProps={{ htmlInput: { maxLength: 160 } }}
        disabled={save.pending}
      />
      <DateField
        label="Due date"
        value={draft.dueDate}
        onChange={(value) => set('dueDate', value)}
        onProblemChange={setDateProblem}
        disabled={save.pending}
      />
      <OptionSelect
        label="Status"
        options={MILESTONE_STATUS_OPTIONS}
        value={draft.status}
        onChange={(value) => set('status', value as MilestoneStatus)}
        helperText="Done items count towards the project's progress."
        disabled={save.pending}
      />
      <TextField
        label="Description"
        multiline
        minRows={3}
        value={draft.description}
        onChange={(event) => set('description', event.target.value)}
        error={Boolean(errors.description)}
        helperText={errors.description}
        slotProps={{ htmlInput: { maxLength: 1000 } }}
        disabled={save.pending}
      />
    </FormDialog>
  );
};

export interface ProgressOverrideDialogProps {
  open: boolean;
  initial: OverrideDraft;
  /** The counted figure, shown so the reader knows what they are replacing. */
  countedText: string;
  onSave: (override: ProjectProgressOverride) => Promise<unknown>;
  onClose: () => void;
}

/** Setting the progress figure by hand, with the reason that will be shown beside it. */
export const ProgressOverrideDialog = ({
  open,
  initial,
  countedText,
  onSave,
  onClose,
}: ProgressOverrideDialogProps): JSX.Element => {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof OverrideDraft, string>>>({});
  const save = useDialogSave('The figure could not be saved. Try again.');
  const submit = (): void => {
    const parsed = parseOverrideDraft(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    void save.run(() => onSave(parsed.override), onClose);
  };
  return (
    <FormDialog
      open={open}
      title="Set progress by hand"
      icon={<TuneRoundedIcon />}
      submitLabel="Set figure"
      pending={save.pending}
      error={save.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Alert severity="warning">
        A figure set by hand replaces the count of finished tasks and milestones everywhere the
        project appears, until you go back to counting work. Use it only when the count misses
        something real, and say why. The count today: {countedText}.
      </Alert>
      <TextField
        label="Progress (%)"
        required
        type="number"
        value={draft.value}
        onChange={(event) => setDraft((previous) => ({ ...previous, value: event.target.value }))}
        error={Boolean(errors.value)}
        helperText={errors.value ?? 'A whole number from 0 to 100.'}
        slotProps={{ htmlInput: { min: 0, max: 100, step: 1, inputMode: 'numeric' } }}
        disabled={save.pending}
      />
      <TextField
        label="Reason"
        required
        value={draft.reason}
        onChange={(event) => setDraft((previous) => ({ ...previous, reason: event.target.value }))}
        error={Boolean(errors.reason)}
        helperText={errors.reason ?? 'Shown beside the figure, such as "Training finished early".'}
        slotProps={{ htmlInput: { maxLength: 300 } }}
        disabled={save.pending}
      />
    </FormDialog>
  );
};

export interface MetricDialogProps {
  open: boolean;
  initial: MetricDraft;
  editing: boolean;
  onSave: (
    metric: Extract<ReturnType<typeof parseMetricDraft>, { ok: true }>['metric'],
  ) => Promise<unknown>;
  onClose: () => void;
}

/** Adding or editing one impact number: what is counted, the count, a target and a suffix. */
export const MetricDialog = ({
  open,
  initial,
  editing,
  onSave,
  onClose,
}: MetricDialogProps): JSX.Element => {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof MetricDraft, string>>>({});
  const save = useDialogSave('The number could not be saved. Try again.');
  const set = (key: keyof MetricDraft, value: string): void =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const submit = (): void => {
    const parsed = parseMetricDraft(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    void save.run(() => onSave(parsed.metric), onClose);
  };
  return (
    <FormDialog
      open={open}
      title={editing ? 'Edit impact number' : 'Add an impact number'}
      description="Something the project is moving, such as people trained or hubs opened."
      icon={<InsightsOutlinedIcon />}
      submitLabel={editing ? 'Save changes' : 'Add'}
      pending={save.pending}
      error={save.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label="What is counted"
        required
        autoFocus
        value={draft.label}
        onChange={(event) => set('label', event.target.value)}
        error={Boolean(errors.label)}
        helperText={errors.label}
        slotProps={{ htmlInput: { maxLength: 80 } }}
        disabled={save.pending}
      />
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField
          label="So far"
          required
          type="number"
          value={draft.value}
          onChange={(event) => set('value', event.target.value)}
          error={Boolean(errors.value)}
          helperText={errors.value}
          slotProps={{ htmlInput: { min: 0, inputMode: 'decimal' } }}
          disabled={save.pending}
        />
        <TextField
          label="Target"
          type="number"
          value={draft.target}
          onChange={(event) => set('target', event.target.value)}
          error={Boolean(errors.target)}
          helperText={errors.target ?? 'Leave empty if there is none.'}
          slotProps={{ htmlInput: { min: 0, inputMode: 'decimal' } }}
          disabled={save.pending}
        />
      </Box>
      <TextField
        label="Shown after the number"
        value={draft.suffix}
        onChange={(event) => set('suffix', event.target.value)}
        error={Boolean(errors.suffix)}
        helperText={errors.suffix ?? 'Such as % or +. Optional.'}
        slotProps={{ htmlInput: { maxLength: 12 } }}
        disabled={save.pending}
      />
    </FormDialog>
  );
};

export interface RiskDialogProps {
  open: boolean;
  initial: RiskDraft;
  editing: boolean;
  onSave: (
    risk: Extract<ReturnType<typeof parseRiskDraft>, { ok: true }>['risk'],
  ) => Promise<unknown>;
  onClose: () => void;
}

/** Adding or editing one risk: what it is, how serious, the plan, and where it stands. */
export const RiskDialog = ({
  open,
  initial,
  editing,
  onSave,
  onClose,
}: RiskDialogProps): JSX.Element => {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof RiskDraft, string>>>({});
  const save = useDialogSave('The risk could not be saved. Try again.');
  const submit = (): void => {
    const parsed = parseRiskDraft(draft);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    void save.run(() => onSave(parsed.risk), onClose);
  };
  return (
    <FormDialog
      open={open}
      title={editing ? 'Edit risk' : 'Add a risk'}
      description="Something that could stop the project, and what is being done about it."
      icon={<ReportProblemOutlinedIcon />}
      submitLabel={editing ? 'Save changes' : 'Add'}
      pending={save.pending}
      error={save.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label="Risk"
        required
        autoFocus
        value={draft.title}
        onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
        error={Boolean(errors.title)}
        helperText={errors.title}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        disabled={save.pending}
      />
      <OptionSelect
        label="How serious"
        options={RISK_LEVEL_OPTIONS}
        value={draft.level}
        onChange={(value) => setDraft((previous) => ({ ...previous, level: value as RiskLevel }))}
        disabled={save.pending}
      />
      <TextField
        label="What is being done about it"
        multiline
        minRows={3}
        value={draft.mitigation}
        onChange={(event) =>
          setDraft((previous) => ({ ...previous, mitigation: event.target.value }))
        }
        error={Boolean(errors.mitigation)}
        helperText={errors.mitigation}
        slotProps={{ htmlInput: { maxLength: 1000 } }}
        disabled={save.pending}
      />
      <OptionSelect
        label="Status"
        options={RISK_STATUS_OPTIONS}
        value={draft.status}
        onChange={(value) => setDraft((previous) => ({ ...previous, status: value as RiskStatus }))}
        disabled={save.pending}
      />
    </FormDialog>
  );
};

export interface MediaDetails {
  caption: string;
  takenOn: string | null;
  shareable: boolean;
}

export interface MediaItemDialogProps {
  open: boolean;
  initial: MediaDetails;
  imageUrl: string;
  onSave: (body: ProjectMediaUpdate) => Promise<unknown>;
  onClose: () => void;
}

/**
 * A photo's details: caption, the day it was taken, and whether the people in
 * it agreed to public use. Only photos cleared for public use are offered to
 * impact stories, so the switch says so where the choice is made.
 */
export const MediaItemDialog = ({
  open,
  initial,
  imageUrl,
  onSave,
  onClose,
}: MediaItemDialogProps): JSX.Element => {
  const [draft, setDraft] = useState(initial);
  // As in MilestoneDialog: a half-typed day holds the save.
  const [dateProblem, setDateProblem] = useState<string | null>(null);
  const save = useDialogSave('The photo could not be saved. Try again.');
  const submit = (): void => {
    if (dateProblem) return;
    const caption = draft.caption.trim();
    void save.run(
      () =>
        onSave({
          // Null removes a caption or date that has been cleared.
          caption: caption || null,
          takenOn: draft.takenOn,
          shareable: draft.shareable,
        }),
      onClose,
    );
  };
  return (
    <FormDialog
      open={open}
      title="Photo details"
      icon={<PhotoOutlinedIcon />}
      submitLabel="Save changes"
      pending={save.pending}
      error={save.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Box
        component="img"
        src={imageUrl}
        alt={draft.caption || 'The photo being edited'}
        sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 2 }}
      />
      <TextField
        label="Caption"
        value={draft.caption}
        onChange={(event) => setDraft((previous) => ({ ...previous, caption: event.target.value }))}
        helperText="Who or what it shows, and where. Also used as its description for screen readers."
        slotProps={{ htmlInput: { maxLength: 300 } }}
        disabled={save.pending}
      />
      <DateField
        label="Taken on"
        value={draft.takenOn}
        onChange={(value) => setDraft((previous) => ({ ...previous, takenOn: value }))}
        onProblemChange={setDateProblem}
        disabled={save.pending}
      />
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={draft.shareable}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, shareable: event.target.checked }))
              }
              disabled={save.pending}
            />
          }
          label="Cleared for public use"
        />
        <FormHelperText sx={{ mx: 0 }}>
          Turn this on only when everyone recognisable in the photo has agreed to it being
          published. Only photos cleared for public use can appear in impact stories.
        </FormHelperText>
      </Box>
    </FormDialog>
  );
};
