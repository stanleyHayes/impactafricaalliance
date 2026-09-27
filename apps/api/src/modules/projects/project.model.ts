import {
  MILESTONE_KINDS,
  MILESTONE_STATUSES,
  PROJECT_STATUSES,
  RISK_LEVELS,
  RISK_STATUSES,
  WORK_PRIORITIES,
  type MediaAsset,
  type MilestoneKind,
  type MilestoneStatus,
  type ProjectStatus,
  type RiskLevel,
  type RiskStatus,
  type WorkPriority,
} from '@iaa/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../common/model-helpers.js';
import {
  fileAttachmentSubSchema,
  userRef,
  userRefList,
  type FileAttachmentRecord,
} from '../../common/work-model-helpers.js';

/**
 * The project data contract (plan §2, `packages/shared/src/schemas/project.ts`).
 * Calendar dates are stored as Dates at noon UTC (plan D6); people as user ids.
 */

export interface ProjectMilestoneRecord {
  id: string;
  kind: MilestoneKind;
  title: string;
  description?: string;
  dueDate?: Date | null;
  status: MilestoneStatus;
  completedAt?: Date | null;
}

export interface ProjectMetricRecord {
  id: string;
  label: string;
  value: number;
  target?: number | null;
  suffix?: string;
}

export interface ProjectRiskRecord {
  id: string;
  title: string;
  level: RiskLevel;
  mitigation?: string;
  status: RiskStatus;
}

export interface ProjectPartnerRecord {
  name: string;
  role?: string;
  url?: string;
}

export interface ProjectMediaRecord {
  id: string;
  image: MediaAsset;
  caption?: string;
  takenOn?: Date | null;
  shareable: boolean;
  addedBy?: Types.ObjectId | null;
  addedAt: Date;
}

/**
 * A stored project. Named `Record` rather than `Document` because
 * `ProjectDocument` in `@iaa/shared` is a file attached to a project.
 */
export interface ProjectRecord {
  title: string;
  slug: string;
  code?: string;
  summary: string;
  /** Markdown. */
  description: string;
  status: ProjectStatus;
  priority: WorkPriority;
  leadId?: Types.ObjectId | null;
  memberIds: Types.ObjectId[];
  /** A `PILLARS` key; see the note on the field below. */
  programme?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  country?: string;
  region?: string;
  locationText?: string;
  objectives: string[];
  partners: ProjectPartnerRecord[];
  tags: string[];
  sdgs: number[];
  cover?: MediaAsset | null;
  milestones: ProjectMilestoneRecord[];
  metrics: ProjectMetricRecord[];
  risks: ProjectRiskRecord[];
  progressOverride?: { value: number; reason: string } | null;
  media: ProjectMediaRecord[];
  documents: FileAttachmentRecord[];
  archivedAt?: Date | null;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectHydrated = HydratedDocument<ProjectRecord>;

const milestoneSubSchema = new Schema<ProjectMilestoneRecord>(
  {
    id: { type: String, required: true },
    kind: { type: String, enum: MILESTONE_KINDS, default: 'milestone' },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date },
    status: { type: String, enum: MILESTONE_STATUSES, default: 'planned' },
    completedAt: { type: Date },
  },
  { _id: false },
);

const metricSubSchema = new Schema<ProjectMetricRecord>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    value: { type: Number, required: true },
    target: { type: Number },
    suffix: { type: String },
  },
  { _id: false },
);

const riskSubSchema = new Schema<ProjectRiskRecord>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    level: { type: String, enum: RISK_LEVELS, default: 'medium' },
    mitigation: { type: String },
    status: { type: String, enum: RISK_STATUSES, default: 'open' },
  },
  { _id: false },
);

const partnerSubSchema = new Schema<ProjectPartnerRecord>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String },
    url: { type: String },
  },
  { _id: false },
);

const progressOverrideSubSchema = new Schema(
  {
    value: { type: Number, required: true, min: 0, max: 100 },
    reason: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const mediaItemSubSchema = new Schema<ProjectMediaRecord>(
  {
    id: { type: String, required: true },
    image: { type: mediaSubSchema, required: true },
    caption: { type: String },
    takenOn: { type: Date },
    // Off unless someone confirms the people pictured agreed to public use.
    shareable: { type: Boolean, default: false },
    addedBy: userRef(),
    addedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const projectSchema = new Schema<ProjectRecord>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    summary: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'draft' },
    priority: { type: String, enum: WORK_PRIORITIES, default: 'medium' },
    leadId: userRef(),
    memberIds: userRefList(),
    // Plain text rather than an enum of today's pillars: renaming a pillar on
    // the public site must not make every project that used it fail to save.
    // The API still checks new values against the list.
    programme: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    country: { type: String, trim: true },
    region: { type: String, trim: true },
    locationText: { type: String, trim: true },
    objectives: { type: [String], default: [] },
    partners: { type: [partnerSubSchema], default: [] },
    tags: { type: [String], default: [] },
    sdgs: { type: [Number], default: [] },
    cover: { type: mediaSubSchema },
    milestones: { type: [milestoneSubSchema], default: [] },
    metrics: { type: [metricSubSchema], default: [] },
    risks: { type: [riskSubSchema], default: [] },
    progressOverride: { type: progressOverrideSubSchema },
    media: { type: [mediaItemSubSchema], default: [] },
    documents: { type: [fileAttachmentSubSchema], default: [] },
    archivedAt: { type: Date },
    createdBy: userRef(),
    updatedBy: userRef(),
  },
  { ...baseSchemaOptions, collection: 'projects' },
);

// Projects are found by slug, and a clash on save is reported as a 409.
projectSchema.index({ slug: 1 }, { unique: true });
// The list's default view: one status tab, most recently changed first.
projectSchema.index({ status: 1, updatedAt: -1 });
// "My projects": the ones I lead.
projectSchema.index({ leadId: 1 });
// "My projects": the ones I am a member of (multikey).
projectSchema.index({ memberIds: 1 });
// Every list leaves archived projects out unless it asks for them.
projectSchema.index({ archivedAt: 1 });

export const ProjectModel = model<ProjectRecord>('Project', projectSchema);
