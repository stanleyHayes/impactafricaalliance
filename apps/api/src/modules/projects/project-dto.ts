import {
  computeProjectProgress,
  type FileAttachment,
  type Milestone,
  type PersonSummary,
  type ProgrammeKey,
  type Project,
  type ProjectListItem,
  type ProjectMediaItem,
  type ProjectMetric,
  type ProjectPartner,
  type ProjectProgress,
  type ProjectRisk,
  type ProjectStatus,
  type ProjectTaskCounts,
} from '@iaa/shared';
import type { Types } from 'mongoose';

import type { FileAttachmentRecord } from '../../common/work-model-helpers.js';

import { AUDITED_PROJECT_FIELDS, type StoredProject } from './project-changes.js';
import type {
  ProjectMediaRecord,
  ProjectMetricRecord,
  ProjectMilestoneRecord,
  ProjectPartnerRecord,
  ProjectRiskRecord,
} from './project.model.js';

/**
 * Stored projects turned into the DTOs in `@iaa/shared`. Pure, so the shape
 * the dashboard receives can be tested without a database.
 */

/** People already looked up, keyed by user id. */
export type PeopleMap = ReadonlyMap<string, PersonSummary>;

/** A project with no linked tasks, or whose counts have not been asked for. */
export const EMPTY_TASK_COUNTS: ProjectTaskCounts = { total: 0, done: 0, open: 0, overdue: 0 };

const iso = (value?: Date | null): string | null => (value ? value.toISOString() : null);

const personFor = (people: PeopleMap, id?: Types.ObjectId | string | null): PersonSummary | null =>
  id ? (people.get(id.toString()) ?? null) : null;

/** Optional text is left out when empty rather than sent as '' or null. */
const text = <K extends string>(key: K, value?: string | null): Partial<Record<K, string>> =>
  (value ? { [key]: value } : {}) as Partial<Record<K, string>>;

export const toMilestone = (item: ProjectMilestoneRecord): Milestone => ({
  id: item.id,
  kind: item.kind,
  title: item.title,
  ...text('description', item.description),
  dueDate: iso(item.dueDate),
  status: item.status,
  completedAt: iso(item.completedAt),
});

export const toMetric = (item: ProjectMetricRecord): ProjectMetric => ({
  id: item.id,
  label: item.label,
  value: item.value,
  target: typeof item.target === 'number' ? item.target : null,
  ...text('suffix', item.suffix),
});

export const toRisk = (item: ProjectRiskRecord): ProjectRisk => ({
  id: item.id,
  title: item.title,
  level: item.level,
  ...text('mitigation', item.mitigation),
  status: item.status,
});

export const toPartner = (item: ProjectPartnerRecord): ProjectPartner => ({
  name: item.name,
  ...text('role', item.role),
  ...text('url', item.url),
});

export const toMediaItem = (item: ProjectMediaRecord, people: PeopleMap): ProjectMediaItem => ({
  id: item.id,
  image: item.image,
  ...text('caption', item.caption),
  takenOn: iso(item.takenOn),
  shareable: item.shareable === true,
  addedBy: personFor(people, item.addedBy),
  addedAt: iso(item.addedAt) ?? new Date(0).toISOString(),
});

export const toDocument = (item: FileAttachmentRecord, people: PeopleMap): FileAttachment => ({
  id: item.id,
  name: item.name,
  file: item.file,
  addedBy: personFor(people, item.addedBy),
  addedAt: iso(item.addedAt) ?? new Date(0).toISOString(),
});

/** Progress from the counted tasks and the stored milestones and override. */
export const progressOf = (
  record: Pick<StoredProject, 'milestones' | 'progressOverride'>,
  counts: ProjectTaskCounts,
): ProjectProgress =>
  computeProjectProgress({
    tasksTotal: counts.total,
    tasksDone: counts.done,
    milestones: record.milestones ?? [],
    override: record.progressOverride ?? null,
  });

/** What the list and the detail both carry. */
const common = (record: StoredProject) => ({
  id: record._id.toString(),
  title: record.title,
  slug: record.slug,
  ...text('code', record.code),
  summary: record.summary,
  status: record.status,
  priority: record.priority,
  programme: (record.programme ?? null) as ProgrammeKey | null,
  memberIds: (record.memberIds ?? []).map((id) => id.toString()),
  startDate: iso(record.startDate),
  endDate: iso(record.endDate),
  ...text('country', record.country),
  tags: record.tags ?? [],
  cover: record.cover ?? null,
  archivedAt: iso(record.archivedAt),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

/** A list row. `people` must hold the lead. */
export const toProjectListItem = (
  record: StoredProject,
  people: PeopleMap,
  counts: ProjectTaskCounts,
): ProjectListItem => ({
  ...common(record),
  lead: personFor(people, record.leadId),
  progress: progressOf(record, counts),
  taskCounts: counts,
});

export interface ProjectDetailContext {
  /** The lead, creator, editor and everyone who added evidence. */
  people: PeopleMap;
  /** Active members only, already in the project's order. */
  members: PersonSummary[];
  taskCounts: ProjectTaskCounts;
  storyCount: number;
}

/** The detail page's project. */
export const toProjectDto = (record: StoredProject, context: ProjectDetailContext): Project => ({
  ...common(record),
  description: record.description ?? '',
  leadId: record.leadId ? record.leadId.toString() : null,
  lead: personFor(context.people, record.leadId),
  members: context.members,
  ...text('region', record.region),
  ...text('locationText', record.locationText),
  objectives: record.objectives ?? [],
  partners: (record.partners ?? []).map(toPartner),
  sdgs: record.sdgs ?? [],
  milestones: (record.milestones ?? []).map(toMilestone),
  metrics: (record.metrics ?? []).map(toMetric),
  risks: (record.risks ?? []).map(toRisk),
  progressOverride: record.progressOverride
    ? { value: record.progressOverride.value, reason: record.progressOverride.reason }
    : null,
  media: (record.media ?? []).map((item) => toMediaItem(item, context.people)),
  documents: (record.documents ?? []).map((item) => toDocument(item, context.people)),
  progress: progressOf(record, context.taskCounts),
  taskCounts: context.taskCounts,
  storyCount: context.storyCount,
  archivedFromStatus: (record.archivedFromStatus ?? null) as ProjectStatus | null,
  createdBy: personFor(context.people, record.createdBy),
  updatedBy: personFor(context.people, record.updatedBy),
});

// ---------------------------------------------------------------------------
// Activity log views
// ---------------------------------------------------------------------------

const dayKey = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === 'string' && value ? value.slice(0, 10) : null;
};

const nameOf = (people: PeopleMap, id: unknown): string | null => {
  if (id === null || id === undefined) return null;
  const key = String(id);
  return people.get(key)?.name ?? key;
};

interface LooseMilestone {
  title: string;
  status: string;
  dueDate?: unknown;
}

interface LooseMetric {
  label: string;
  value: number;
  target?: number | null;
  suffix?: string;
}

interface LooseRisk {
  title: string;
  level: string;
  status: string;
}

const milestoneLine = (item: LooseMilestone): string => {
  const due = dayKey(item.dueDate);
  return `${item.title} (${item.status}${due ? `, due ${due}` : ''})`;
};

const metricLine = (item: LooseMetric): string =>
  `${item.label}: ${item.value}${item.suffix ?? ''}${typeof item.target === 'number' ? ` of ${item.target}` : ''}`;

type Viewer = (value: unknown, people: PeopleMap) => unknown;

// How each structured field reads in the log. Anything not listed is shown
// as it is stored.
const VIEWERS: Record<string, Viewer> = {
  leadId: (value, people) => nameOf(people, value),
  memberIds: (value, people) => (value as unknown[]).map((id) => nameOf(people, id)),
  startDate: dayKey,
  endDate: dayKey,
  milestones: (value) => (value as LooseMilestone[]).map(milestoneLine),
  metrics: (value) => (value as LooseMetric[]).map(metricLine),
  risks: (value) =>
    (value as LooseRisk[]).map((risk) => `${risk.title} (${risk.level} risk, ${risk.status})`),
  partners: (value) => (value as { name: string }[]).map((partner) => partner.name),
  cover: (value) => (value as { publicId?: string } | null)?.publicId ?? null,
  progressOverride: (value) => {
    const override = value as { value: number; reason: string } | null;
    return override ? `${override.value}% (${override.reason})` : null;
  },
};

/**
 * A project, or the changes to one, as the activity log shows it: people by
 * name, dates as days, lists as one line per item. Built for both sides of a
 * change so `diffFields` compares like with like. Keys the input does not
 * hold stay absent, and null stays null, so a PATCH's "leave alone" and
 * "clear" survive the translation.
 */
export const auditView = (
  values: Readonly<Record<string, unknown>>,
  people: PeopleMap,
): Record<string, unknown> => {
  const view: Record<string, unknown> = {};
  for (const field of Object.keys(AUDITED_PROJECT_FIELDS)) {
    const value = values[field];
    if (value === undefined) continue;
    const viewer = VIEWERS[field];
    view[field] = value === null || !viewer ? value : viewer(value, people);
  }
  return view;
};

/** Every user id a change mentions, so their names can be looked up in one query. */
export const peopleIn = (values: Readonly<Record<string, unknown>>): string[] => {
  const ids: string[] = [];
  if (values.leadId) ids.push(String(values.leadId));
  if (Array.isArray(values.memberIds)) ids.push(...values.memberIds.map(String));
  return ids;
};
