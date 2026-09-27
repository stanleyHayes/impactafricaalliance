import {
  newStableId,
  progressOverrideSchema,
  type Milestone,
  type MilestoneKind,
  type MilestoneStatus,
  type ProjectProgressOverride,
  type ProjectUpdate,
} from '@iaa/shared';

/** One milestone as a PATCH sends it. */
export type MilestoneInput = NonNullable<ProjectUpdate['milestones']>[number];

/**
 * Editing a project's milestones and activities, and its hand-set progress
 * figure. Each change produces the whole new list, which the tab sends in one
 * PATCH; the server keeps `completedAt`, so nothing here sets it.
 */

/** What the add/edit dialog holds: five fields, well inside the dialog limit. */
export interface MilestoneDraft {
  kind: MilestoneKind;
  title: string;
  dueDate: string | null;
  status: MilestoneStatus;
  description: string;
}

export const emptyMilestoneDraft = (): MilestoneDraft => ({
  kind: 'milestone',
  title: '',
  dueDate: null,
  status: 'planned',
  description: '',
});

export const draftFromMilestone = (milestone: Milestone): MilestoneDraft => ({
  kind: milestone.kind,
  title: milestone.title,
  dueDate: milestone.dueDate ?? null,
  status: milestone.status,
  description: milestone.description ?? '',
});

export type MilestoneDraftErrors = Partial<Record<keyof MilestoneDraft, string>>;

/** The same limits the API applies, said in words. */
export const milestoneDraftErrors = (draft: MilestoneDraft): MilestoneDraftErrors => {
  const errors: MilestoneDraftErrors = {};
  const title = draft.title.trim();
  if (title.length < 2) errors.title = 'Give it a title of at least 2 characters.';
  else if (title.length > 160) errors.title = 'Keep the title to 160 characters.';
  if (draft.description.trim().length > 1000) {
    errors.description = 'Keep the description to 1,000 characters.';
  }
  return errors;
};

/** A milestone as the API takes it: `completedAt` is the server's to keep. */
export const toMilestoneInput = (milestone: Milestone): MilestoneInput => ({
  id: milestone.id,
  kind: milestone.kind,
  title: milestone.title,
  ...(milestone.description ? { description: milestone.description } : {}),
  dueDate: milestone.dueDate ?? null,
  status: milestone.status,
});

const fromDraft = (id: string, draft: MilestoneDraft): MilestoneInput => ({
  id,
  kind: draft.kind,
  title: draft.title.trim(),
  ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
  dueDate: draft.dueDate,
  status: draft.status,
});

/**
 * The list with a draft saved into it: replacing the item being edited in
 * place, or added at the end with a fresh id when it is new.
 */
export const saveMilestoneDraft = (
  milestones: readonly Milestone[],
  draft: MilestoneDraft,
  editingId: string | null,
): MilestoneInput[] => {
  const inputs = milestones.map(toMilestoneInput);
  if (editingId && inputs.some((item) => item.id === editingId)) {
    return inputs.map((item) => (item.id === editingId ? fromDraft(editingId, draft) : item));
  }
  return [...inputs, fromDraft(newStableId(draft.kind), draft)];
};

/** Done becomes planned again; anything else becomes done. */
export const toggleMilestoneDone = (
  milestones: readonly Milestone[],
  id: string,
): MilestoneInput[] =>
  milestones.map((item) =>
    item.id === id
      ? { ...toMilestoneInput(item), status: item.status === 'done' ? 'planned' : 'done' }
      : toMilestoneInput(item),
  );

/** The list with one item moved up (-1) or down (+1); unchanged at either end. */
export const moveMilestone = (
  milestones: readonly Milestone[],
  id: string,
  offset: -1 | 1,
): MilestoneInput[] => {
  const inputs = milestones.map(toMilestoneInput);
  const from = inputs.findIndex((item) => item.id === id);
  const to = from + offset;
  if (from === -1 || to < 0 || to >= inputs.length) return inputs;
  const [moved] = inputs.splice(from, 1);
  inputs.splice(to, 0, moved as MilestoneInput);
  return inputs;
};

export const removeMilestone = (milestones: readonly Milestone[], id: string): MilestoneInput[] =>
  milestones.filter((item) => item.id !== id).map(toMilestoneInput);

/** What the progress dialog holds, as typed. */
export interface OverrideDraft {
  value: string;
  reason: string;
}

export const overrideDraftFrom = (override?: ProjectProgressOverride | null): OverrideDraft => ({
  value: override ? String(override.value) : '',
  reason: override?.reason ?? '',
});

/**
 * The figure to save, or the problems with what was typed. A whole number
 * from 0 to 100, and a reason of at least 3 characters so the page can say
 * why the figure is not a count.
 */
export const parseOverrideDraft = (
  draft: OverrideDraft,
):
  | { ok: true; override: ProjectProgressOverride }
  | { ok: false; errors: Partial<Record<keyof OverrideDraft, string>> } => {
  const errors: Partial<Record<keyof OverrideDraft, string>> = {};
  const value = Number(draft.value);
  if (draft.value.trim() === '' || !Number.isInteger(value) || value < 0 || value > 100) {
    errors.value = 'Enter a whole number from 0 to 100.';
  }
  const reason = draft.reason.trim();
  if (reason.length < 3) errors.reason = 'Say why, in at least 3 characters.';
  else if (reason.length > 300) errors.reason = 'Keep the reason to 300 characters.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const parsed = progressOverrideSchema.safeParse({ value, reason });
  return parsed.success
    ? { ok: true, override: parsed.data }
    : { ok: false, errors: { value: 'Enter a whole number from 0 to 100.' } };
};
