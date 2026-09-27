import {
  newStableId,
  type ProjectMetric,
  type ProjectRisk,
  type ProjectUpdate,
  type RiskLevel,
  type RiskStatus,
} from '@iaa/shared';

/** One impact number as a PATCH sends it. */
export type ProjectMetricInput = NonNullable<ProjectUpdate['metrics']>[number];
/** One risk as a PATCH sends it. */
export type ProjectRiskInput = NonNullable<ProjectUpdate['risks']>[number];

/**
 * Editing a project's impact numbers and risks. Like milestones, each change
 * produces the whole new list for one PATCH.
 */

export interface MetricDraft {
  label: string;
  value: string;
  target: string;
  suffix: string;
}

export const emptyMetricDraft = (): MetricDraft => ({
  label: '',
  value: '',
  target: '',
  suffix: '',
});

export const draftFromMetric = (metric: ProjectMetric): MetricDraft => ({
  label: metric.label,
  value: String(metric.value),
  target: typeof metric.target === 'number' ? String(metric.target) : '',
  suffix: metric.suffix ?? '',
});

type Errors<T> = Partial<Record<keyof T, string>>;

const numberOrNull = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
};

/** The metric to save, or what is wrong with the draft. */
export const parseMetricDraft = (
  draft: MetricDraft,
):
  | { ok: true; metric: Omit<ProjectMetricInput, 'id'> }
  | { ok: false; errors: Errors<MetricDraft> } => {
  const errors: Errors<MetricDraft> = {};
  const label = draft.label.trim();
  if (!label) errors.label = 'Say what is being counted, such as "People trained".';
  else if (label.length > 80) errors.label = 'Keep the label to 80 characters.';
  const value = numberOrNull(draft.value);
  if (value === null || Number.isNaN(value) || value < 0) {
    errors.value = 'Enter the number so far, 0 or more.';
  }
  const target = numberOrNull(draft.target);
  if (target !== null && (Number.isNaN(target) || target < 0)) {
    errors.target = 'Enter a target of 0 or more, or leave it empty.';
  }
  if (draft.suffix.trim().length > 12) errors.suffix = 'Keep it to 12 characters.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    metric: {
      label,
      value: value as number,
      target,
      ...(draft.suffix.trim() ? { suffix: draft.suffix.trim() } : {}),
    },
  };
};

const metricInput = (metric: ProjectMetric): ProjectMetricInput => ({
  id: metric.id,
  label: metric.label,
  value: metric.value,
  target: metric.target ?? null,
  ...(metric.suffix ? { suffix: metric.suffix } : {}),
});

/** How far a number has come towards its target, 0–100, or null with no target to measure against. */
export const towardsTarget = (metric: Pick<ProjectMetric, 'value' | 'target'>): number | null => {
  if (typeof metric.target !== 'number' || metric.target <= 0) return null;
  return Math.min(100, Math.round((metric.value / metric.target) * 100));
};

export interface RiskDraft {
  title: string;
  level: RiskLevel;
  mitigation: string;
  status: RiskStatus;
}

export const emptyRiskDraft = (): RiskDraft => ({
  title: '',
  level: 'medium',
  mitigation: '',
  status: 'open',
});

export const draftFromRisk = (risk: ProjectRisk): RiskDraft => ({
  title: risk.title,
  level: risk.level,
  mitigation: risk.mitigation ?? '',
  status: risk.status,
});

/** The risk to save, or what is wrong with the draft. */
export const parseRiskDraft = (
  draft: RiskDraft,
): { ok: true; risk: Omit<ProjectRiskInput, 'id'> } | { ok: false; errors: Errors<RiskDraft> } => {
  const errors: Errors<RiskDraft> = {};
  const title = draft.title.trim();
  if (title.length < 2) errors.title = 'Describe the risk in at least 2 characters.';
  else if (title.length > 200) errors.title = 'Keep it to 200 characters.';
  if (draft.mitigation.trim().length > 1000) {
    errors.mitigation = 'Keep the plan to 1,000 characters.';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    risk: {
      title,
      level: draft.level,
      ...(draft.mitigation.trim() ? { mitigation: draft.mitigation.trim() } : {}),
      status: draft.status,
    },
  };
};

const riskInput = (risk: ProjectRisk): ProjectRiskInput => ({
  id: risk.id,
  title: risk.title,
  level: risk.level,
  ...(risk.mitigation ? { mitigation: risk.mitigation } : {}),
  status: risk.status,
});

/**
 * A list with one item saved into it: replaced in place when editing, or
 * added at the end with a fresh id.
 */
const upsert = <T extends { id: string }>(
  items: readonly T[],
  item: Omit<T, 'id'>,
  editingId: string | null,
  prefix: string,
): T[] =>
  editingId && items.some((existing) => existing.id === editingId)
    ? items.map((existing) =>
        existing.id === editingId ? ({ ...item, id: editingId } as T) : existing,
      )
    : [...items, { ...item, id: newStableId(prefix) } as T];

export const saveMetric = (
  metrics: readonly ProjectMetric[],
  metric: Omit<ProjectMetricInput, 'id'>,
  editingId: string | null,
): ProjectMetricInput[] => upsert(metrics.map(metricInput), metric, editingId, 'metric');

export const removeMetric = (metrics: readonly ProjectMetric[], id: string): ProjectMetricInput[] =>
  metrics.filter((metric) => metric.id !== id).map(metricInput);

export const saveRisk = (
  risks: readonly ProjectRisk[],
  risk: Omit<ProjectRiskInput, 'id'>,
  editingId: string | null,
): ProjectRiskInput[] => upsert(risks.map(riskInput), risk, editingId, 'risk');

export const removeRisk = (risks: readonly ProjectRisk[], id: string): ProjectRiskInput[] =>
  risks.filter((risk) => risk.id !== id).map(riskInput);
