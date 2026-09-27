import { z } from 'zod';

import { PILLARS } from '../constants/content.js';

import {
  clearableDate,
  objectIdSchema,
  paginationQuerySchema,
  slugSchema,
  type MediaAsset,
  type Timestamped,
} from './common.js';
import { partialForUpdate } from './update.js';
import {
  booleanQueryParam,
  clearableTextField,
  fileAttachmentInputSchema,
  hasUniqueIds,
  httpsMediaAssetSchema,
  httpsUrlSchema,
  optionalTextField,
  stableIdSchema,
  WORK_PRIORITIES,
  type FileAttachment,
  type PersonSummary,
  type WorkPriority,
} from './work.js';

/**
 * A project is the operational home of an initiative: who leads it, when it
 * runs, what it is meant to achieve, and the evidence that it did. It is an
 * internal working record. Nothing here is public until someone writes an
 * impact story from it, and that story is a copy, never a live view.
 */

/**
 * Where a project is in its life. `archived` takes it out of every list
 * without deleting the tasks and stories that point at it.
 */
export const PROJECT_STATUSES = [
  'draft',
  'planned',
  'active',
  'on-hold',
  'completed',
  'archived',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Each status as it reads in a sentence, so an API message ("cannot move from
 * Draft to Completed") and the dashboard's chips use the same words.
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  planned: 'Planned',
  active: 'Active',
  'on-hold': 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

/**
 * The moves allowed from each status. Loose on purpose: projects pause,
 * restart and get reopened, and a rule that forbids what really happened only
 * teaches people to pick the wrong status. What it does refuse is completing
 * or pausing work that never started, and sending live work back to planning.
 * Anything archived can be restored to any working status.
 */
export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  draft: ['planned', 'active', 'archived'],
  planned: ['draft', 'active', 'on-hold', 'archived'],
  active: ['on-hold', 'completed', 'archived'],
  'on-hold': ['active', 'completed', 'archived'],
  completed: ['active', 'archived'],
  archived: ['draft', 'planned', 'active', 'on-hold', 'completed'],
};

/** True when a project may move from one status to another. Staying put is always allowed. */
export const canTransitionProject = (from: ProjectStatus, to: ProjectStatus): boolean =>
  from === to || PROJECT_STATUS_TRANSITIONS[from].includes(to);

/**
 * Where "Restore" takes an archived project: back to the status it was
 * archived from, or to draft when that is not known. Draft is the one status
 * that promises nothing, so a project restored blind never claims to be
 * running.
 */
export const projectRestoreStatus = (
  archivedFromStatus?: ProjectStatus | null,
): Exclude<ProjectStatus, 'archived'> =>
  archivedFromStatus && archivedFromStatus !== 'archived' ? archivedFromStatus : 'draft';

/** A milestone is a checkpoint with a date; an activity is a piece of delivery work. */
export const MILESTONE_KINDS = ['milestone', 'activity'] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export const MILESTONE_STATUSES = ['planned', 'in-progress', 'done'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const RISK_LEVELS = ['low', 'medium', 'high'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_STATUSES = ['open', 'mitigated', 'closed'] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

/**
 * The programme areas a project or story can belong to, taken from the
 * pillars on the public site so the two never disagree about what the
 * programmes are called.
 */
export const PROGRAMME_KEYS: readonly string[] = PILLARS.map((pillar) => pillar.key);

export const programmeKeySchema = z.enum(PROGRAMME_KEYS as [string, ...string[]], {
  message: 'Choose one of the programme areas',
});
export type ProgrammeKey = z.infer<typeof programmeKeySchema>;

/**
 * One milestone or activity. The list is replaced whole on every save, so the
 * id is what keeps "this one" stable between edits and lets tasks point at it.
 *
 * `completedAt` is kept by the API: stamped when the item first reaches
 * `done` and cleared when it leaves, whatever the client sends.
 */
export const milestoneSchema = z.object({
  id: stableIdSchema,
  kind: z.enum(MILESTONE_KINDS).default('milestone'),
  title: z.string().trim().min(2).max(160),
  description: optionalTextField(1000),
  dueDate: clearableDate.optional(),
  status: z.enum(MILESTONE_STATUSES).default('planned'),
  completedAt: clearableDate.optional(),
});
export type MilestoneInput = z.input<typeof milestoneSchema>;

/** A number the project is moving: people trained, hubs opened. */
export const projectMetricSchema = z.object({
  id: stableIdSchema,
  label: z.string().trim().min(1).max(80),
  value: z.number().min(0),
  /** What success looks like; absent when the team has not set one. */
  target: z.number().min(0).nullable().optional(),
  /** Shown after the number, such as `%` or `+`. */
  suffix: optionalTextField(12),
});
export type ProjectMetricInput = z.input<typeof projectMetricSchema>;

/** Something that could stop the project, and what is being done about it. */
export const projectRiskSchema = z.object({
  id: stableIdSchema,
  title: z.string().trim().min(2).max(200),
  level: z.enum(RISK_LEVELS).default('medium'),
  mitigation: optionalTextField(1000),
  status: z.enum(RISK_STATUSES).default('open'),
});
export type ProjectRiskInput = z.input<typeof projectRiskSchema>;

/**
 * An organisation the project works with. Free text rather than a link to the
 * Partners page, because most delivery partners never appear there.
 */
export const projectPartnerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: optionalTextField(120),
  url: z
    .union([z.literal(''), httpsUrlSchema])
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});
export type ProjectPartnerInput = z.input<typeof projectPartnerSchema>;

/**
 * A progress figure set by hand, with the reason. The computed figure is
 * preferred; this exists for work that tasks and milestones do not capture,
 * and the reason is shown beside it so nobody mistakes it for a count.
 */
export const progressOverrideSchema = z.object({
  value: z.number().int().min(0).max(100),
  reason: z.string().trim().min(3).max(300),
});
export type ProjectProgressOverride = z.infer<typeof progressOverrideSchema>;

/**
 * Creating or replacing a project's details.
 *
 * Start and end dates are calendar days stored at noon UTC (see
 * `toCalendarDateIso`). Their order is checked by the API with
 * `projectDateProblem` on the merged record, because a PATCH may move only one
 * of them. Media and documents are not here: they have their own endpoints so
 * two people adding evidence at once do not overwrite each other.
 */
export const projectInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: slugSchema,
  /** A short reference used in conversation and file names, such as `DSH-2026`. */
  code: optionalTextField(40),
  summary: z.string().trim().min(10).max(400),
  /** Markdown. */
  description: z.string().trim().max(20000).default(''),
  status: z.enum(PROJECT_STATUSES).default('draft'),
  priority: z.enum(WORK_PRIORITIES).default('medium'),
  leadId: objectIdSchema.nullable().optional(),
  memberIds: z.array(objectIdSchema).max(50).default([]),
  programme: programmeKeySchema.nullable().optional(),
  startDate: clearableDate.optional(),
  endDate: clearableDate.optional(),
  country: optionalTextField(80),
  region: optionalTextField(120),
  /** Where the work happens, in words: "Tamale and surrounding districts". */
  locationText: optionalTextField(200),
  objectives: z.array(z.string().trim().min(2).max(300)).max(20).default([]),
  partners: z.array(projectPartnerSchema).max(30).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  /** UN Sustainable Development Goal numbers. */
  sdgs: z.array(z.number().int().min(1).max(17)).max(17).default([]),
  cover: httpsMediaAssetSchema.nullable().optional(),
  milestones: z
    .array(milestoneSchema)
    .max(100)
    .refine(hasUniqueIds, 'Each milestone needs its own id')
    .default([]),
  metrics: z
    .array(projectMetricSchema)
    .max(30)
    .refine(hasUniqueIds, 'Each metric needs its own id')
    .default([]),
  risks: z
    .array(projectRiskSchema)
    .max(30)
    .refine(hasUniqueIds, 'Each risk needs its own id')
    .default([]),
  progressOverride: progressOverrideSchema.nullable().optional(),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

/**
 * Explicit null clears an optional field on PATCH; omission leaves it alone.
 * Lists are replaced whole when sent.
 */
export const projectUpdateSchema = partialForUpdate(projectInputSchema).extend({
  code: clearableTextField(40),
  country: clearableTextField(80),
  region: clearableTextField(120),
  locationText: clearableTextField(200),
});
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

/** Most photos one project keeps as evidence. */
export const PROJECT_MEDIA_LIMIT = 200;
/** Most documents one project keeps. */
export const PROJECT_DOCUMENT_LIMIT = 100;

/**
 * A photo added as evidence. `shareable` records that the people in it agreed
 * to public use; only shareable photos are offered to impact stories, so the
 * default is no.
 */
export const projectMediaInputSchema = z.object({
  image: httpsMediaAssetSchema,
  caption: optionalTextField(300),
  /** The day it was taken, as a calendar day at noon UTC. */
  takenOn: clearableDate.optional(),
  shareable: z.boolean().default(false),
});
export type ProjectMediaInput = z.infer<typeof projectMediaInputSchema>;

/**
 * Editing a photo's details. The picture itself cannot be swapped: a
 * different photo is different evidence, and is added as a new item.
 */
export const projectMediaUpdateSchema = partialForUpdate(
  projectMediaInputSchema.omit({ image: true }),
).extend({
  caption: clearableTextField(300),
});
export type ProjectMediaUpdate = z.infer<typeof projectMediaUpdateSchema>;

/** Attaching a document to a project. */
export const projectDocumentInputSchema = fileAttachmentInputSchema;
export type ProjectDocumentInput = z.infer<typeof projectDocumentInputSchema>;

export const PROJECT_SORTS = ['updated', 'start', 'end', 'title'] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

/**
 * `GET /api/admin/projects`. Archived projects are left out unless
 * `includeArchived=true` or `status=archived` asks for them. `mine` means led
 * by or a member of the caller.
 */
export const projectListQuerySchema = paginationQuerySchema.extend({
  q: optionalTextField(80),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(WORK_PRIORITIES).optional(),
  programme: programmeKeySchema.optional(),
  mine: booleanQueryParam,
  includeArchived: booleanQueryParam,
  sort: z.enum(PROJECT_SORTS).default('updated'),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export interface Milestone {
  id: string;
  kind: MilestoneKind;
  title: string;
  description?: string;
  dueDate?: string | null;
  status: MilestoneStatus;
  completedAt?: string | null;
}

export interface ProjectMetric {
  id: string;
  label: string;
  value: number;
  target?: number | null;
  suffix?: string;
}

export interface ProjectRisk {
  id: string;
  title: string;
  level: RiskLevel;
  mitigation?: string;
  status: RiskStatus;
}

export interface ProjectPartner {
  name: string;
  role?: string;
  url?: string;
}

/** A photo in a project's evidence, with who added it. */
export interface ProjectMediaItem {
  id: string;
  image: MediaAsset;
  caption?: string;
  takenOn?: string | null;
  shareable: boolean;
  addedBy: PersonSummary | null;
  addedAt: string;
}

export type ProjectDocument = FileAttachment;

/** Where a progress figure came from, so the page can say so. */
export const PROJECT_PROGRESS_SOURCES = ['tasks-and-milestones', 'manual', 'none'] as const;
export type ProjectProgressSource = (typeof PROJECT_PROGRESS_SOURCES)[number];

/**
 * A project's progress. `done` and `total` are always the counted figures,
 * even when a manual value overrides them, so the page can show both.
 */
export interface ProjectProgress {
  /** 0–100, or null when there is nothing to count and no manual figure. */
  value: number | null;
  source: ProjectProgressSource;
  done: number;
  total: number;
  /** Why the figure was set by hand. */
  reason?: string;
}

/** Task counts for a project. Archived tasks are not counted. */
export interface ProjectTaskCounts {
  total: number;
  done: number;
  open: number;
  overdue: number;
}

/** Enough of a project to name and link it from a task or a story. */
export interface ProjectRef {
  id: string;
  title: string;
  slug: string;
}

/** A project as its detail page sees it. */
export interface Project extends Timestamped {
  title: string;
  slug: string;
  code?: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  priority: WorkPriority;
  leadId?: string | null;
  lead: PersonSummary | null;
  memberIds: string[];
  /** Active colleagues only; someone removed from the team drops out of this list. */
  members: PersonSummary[];
  programme?: ProgrammeKey | null;
  startDate?: string | null;
  endDate?: string | null;
  country?: string;
  region?: string;
  locationText?: string;
  objectives: string[];
  partners: ProjectPartner[];
  tags: string[];
  sdgs: number[];
  cover?: MediaAsset | null;
  milestones: Milestone[];
  metrics: ProjectMetric[];
  risks: ProjectRisk[];
  progressOverride?: ProjectProgressOverride | null;
  media: ProjectMediaItem[];
  documents: ProjectDocument[];
  progress: ProjectProgress;
  taskCounts: ProjectTaskCounts;
  /** Impact stories written from this project, published or not. */
  storyCount: number;
  archivedAt?: string | null;
  /**
   * The status the project had when it was archived, so restoring it puts it
   * back where it was rather than making someone remember. Null when it is
   * not archived, or was archived before this was recorded.
   */
  archivedFromStatus?: ProjectStatus | null;
  createdBy?: PersonSummary | null;
  updatedBy?: PersonSummary | null;
}

/** A project as a list row: no long text, evidence or plans. */
export interface ProjectListItem extends Timestamped {
  title: string;
  slug: string;
  code?: string;
  summary: string;
  status: ProjectStatus;
  priority: WorkPriority;
  programme?: ProgrammeKey | null;
  lead: PersonSummary | null;
  memberIds: string[];
  startDate?: string | null;
  endDate?: string | null;
  country?: string;
  tags: string[];
  cover?: MediaAsset | null;
  progress: ProjectProgress;
  taskCounts: ProjectTaskCounts;
  archivedAt?: string | null;
}

/** What `computeProjectProgress` counts. */
export interface ProjectProgressInput {
  /** Tasks linked to the project, not counting archived ones. */
  tasksTotal: number;
  tasksDone: number;
  milestones: readonly Pick<Milestone, 'status'>[];
  override?: ProjectProgressOverride | null;
}

/**
 * Progress as finished work over all work: done tasks and done milestones
 * over every task and milestone, rounded to a whole percentage.
 *
 * A manual override wins, and is marked as manual so it is shown as "set by
 * hand" with its reason. With nothing to count the value is null rather than
 * 0%, because an empty project has not failed to start.
 */
export const computeProjectProgress = ({
  tasksTotal,
  tasksDone,
  milestones,
  override,
}: ProjectProgressInput): ProjectProgress => {
  const safeTasksTotal = Math.max(0, tasksTotal);
  const safeTasksDone = Math.min(Math.max(0, tasksDone), safeTasksTotal);
  const milestonesDone = milestones.filter((milestone) => milestone.status === 'done').length;
  const total = safeTasksTotal + milestones.length;
  const done = safeTasksDone + milestonesDone;
  if (override) {
    return { value: override.value, source: 'manual', done, total, reason: override.reason };
  }
  if (total === 0) {
    return { value: null, source: 'none', done: 0, total: 0 };
  }
  return { value: Math.round((done / total) * 100), source: 'tasks-and-milestones', done, total };
};

/**
 * A message when a project would end before it starts, otherwise null. The
 * same day for both is fine: plenty of activities last a day.
 */
export const projectDateProblem = (start?: string | null, end?: string | null): string | null => {
  if (!start || !end) {
    return null;
  }
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return null;
  }
  return endTime < startTime ? 'The end date is before the start date.' : null;
};
