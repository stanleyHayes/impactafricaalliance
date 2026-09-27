import {
  PROJECT_STATUS_TRANSITIONS,
  projectDateProblem,
  projectInputSchema,
  type MediaAsset,
  type Project,
  type ProjectInput,
  type ProjectStatus,
  type ProjectUpdate,
  type WorkPriority,
} from '@iaa/shared';

import { ApiError } from '../../lib/api-client';
import { slugify } from '../../lib/slug';

/**
 * The project editor's state, checks and request bodies. Kept out of the page
 * so each rule can be tested on its own, and so create and edit share one
 * flow (AGENTS.md).
 */

export const PROJECT_FORM_STEPS = [
  'Basics',
  'People',
  'Schedule & place',
  'Scope',
  'Story & cover',
  'Review',
] as const;

/** Index of the last step, where the only action is saving. */
export const REVIEW_STEP = PROJECT_FORM_STEPS.length - 1;

export interface PartnerRow {
  name: string;
  role: string;
  url: string;
}

/** Everything the editor holds, as the fields hold it: text as text, no date parsing. */
export interface ProjectFormState {
  title: string;
  slug: string;
  /** Once someone edits the slug, the title stops rewriting it. */
  slugTouched: boolean;
  summary: string;
  status: ProjectStatus;
  priority: WorkPriority;
  leadId: string | null;
  memberIds: string[];
  startDate: string | null;
  endDate: string | null;
  country: string;
  region: string;
  locationText: string;
  programme: string;
  objectives: string[];
  partners: PartnerRow[];
  sdgs: number[];
  tags: string[];
  description: string;
  cover?: MediaAsset;
  code: string;
}

export const emptyProjectForm = (): ProjectFormState => ({
  title: '',
  slug: '',
  slugTouched: false,
  summary: '',
  status: 'draft',
  priority: 'medium',
  leadId: null,
  memberIds: [],
  startDate: null,
  endDate: null,
  country: '',
  region: '',
  locationText: '',
  programme: '',
  objectives: [],
  partners: [],
  sdgs: [],
  tags: [],
  description: '',
  code: '',
});

/** A saved project in the editor. Its slug is treated as chosen, so a new title never moves it. */
export const projectToForm = (project: Project): ProjectFormState => ({
  title: project.title,
  slug: project.slug,
  slugTouched: true,
  summary: project.summary,
  status: project.status,
  priority: project.priority,
  leadId: project.leadId ?? null,
  memberIds: [...project.memberIds],
  startDate: project.startDate ?? null,
  endDate: project.endDate ?? null,
  country: project.country ?? '',
  region: project.region ?? '',
  locationText: project.locationText ?? '',
  programme: project.programme ?? '',
  objectives: [...project.objectives],
  partners: project.partners.map((partner) => ({
    name: partner.name,
    role: partner.role ?? '',
    url: partner.url ?? '',
  })),
  sdgs: [...project.sdgs],
  tags: [...project.tags],
  description: project.description,
  ...(project.cover ? { cover: project.cover } : {}),
  code: project.code ?? '',
});

/** A new title, carrying the slug along until someone has chosen one. */
export const withTitle = (form: ProjectFormState, title: string): ProjectFormState => ({
  ...form,
  title,
  slug: form.slugTouched ? form.slug : slugify(title),
});

/**
 * Statuses the editor offers. A new project starts in any working status; a
 * saved one can stay put or take one of the moves the lifecycle allows.
 * Archiving has its own confirmed action on the project page, so it is not
 * offered here unless the project already is archived.
 */
export const editorStatuses = (current: ProjectStatus | null): ProjectStatus[] => {
  if (!current) return ['draft', 'planned', 'active', 'on-hold', 'completed'];
  const moves = PROJECT_STATUS_TRANSITIONS[current].filter((status) => status !== 'archived');
  return [current, ...moves];
};

/** The fields each step owns, by the first part of their path. */
const STEP_FIELDS: readonly (readonly string[])[] = [
  ['title', 'slug', 'summary', 'status', 'priority'],
  ['leadId', 'memberIds'],
  ['startDate', 'endDate', 'country', 'region', 'locationText'],
  ['programme', 'objectives', 'partners', 'sdgs', 'tags'],
  ['description', 'cover', 'code'],
  [],
];

/** The step a field lives on, or null for a field the editor does not show. */
export const stepOfField = (path: string): number | null => {
  const field = path.split('.')[0] ?? '';
  const index = STEP_FIELDS.findIndex((fields) => fields.includes(field));
  return index === -1 ? null : index;
};

const isBlankPartner = (row: PartnerRow): boolean =>
  !row.name.trim() && !row.role.trim() && !row.url.trim();

/**
 * The raw body the create schema checks. Blank objective lines and wholly
 * blank partner rows are dropped, since an empty row is not a mistake worth
 * stopping someone for; a partner with a link but no name still is.
 */
const rawInput = (form: ProjectFormState): Record<string, unknown> => ({
  title: form.title,
  slug: form.slug,
  summary: form.summary,
  status: form.status,
  priority: form.priority,
  leadId: form.leadId,
  memberIds: form.memberIds,
  startDate: form.startDate,
  endDate: form.endDate,
  country: form.country,
  region: form.region,
  locationText: form.locationText,
  programme: form.programme || null,
  objectives: form.objectives.map((line) => line.trim()).filter(Boolean),
  partners: form.partners
    .filter((row) => !isBlankPartner(row))
    .map((row) => ({ name: row.name, role: row.role, url: row.url.trim() })),
  sdgs: [...form.sdgs].sort((a, b) => a - b),
  tags: form.tags,
  description: form.description,
  cover: form.cover ?? null,
  code: form.code,
});

export type ProjectParse = ReturnType<typeof projectInputSchema.safeParse>;

export const parseProjectForm = (form: ProjectFormState): ProjectParse =>
  projectInputSchema.safeParse(rawInput(form));

/** Field errors keyed by path (`title`, `partners.0.url`), first message per path. */
export type FieldErrors = Record<string, string>;

/** Words for the schema messages that would otherwise read like a developer wrote them. */
const friendly = (path: string, message: string): string => {
  const field = path.split('.')[0];
  if (field === 'title') return 'Give the project a title of at least 3 characters.';
  if (field === 'summary') return 'Write a summary of at least 10 characters (400 at most).';
  if (field === 'slug')
    return 'Use lowercase words joined by single hyphens, such as digital-skills-hub.';
  if (/^partners\.\d+\.name$/.test(path)) return 'Name the partner, or remove the row.';
  if (/^objectives\.\d+$/.test(path)) return 'Write at least 2 characters, or remove the line.';
  return message;
};

/** Every problem with the form, by field. */
export const projectFormErrors = (form: ProjectFormState): FieldErrors => {
  const errors: FieldErrors = {};
  const parsed = parseProjectForm(form);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      errors[path] ??= friendly(path, issue.message);
    }
  }
  const dates = projectDateProblem(form.startDate, form.endDate);
  if (dates) errors.endDate ??= dates;
  return errors;
};

/** The problems on one step only, so Continue checks just what is on screen. */
export const stepErrors = (form: ProjectFormState, step: number): FieldErrors =>
  Object.fromEntries(
    Object.entries(projectFormErrors(form)).filter(([path]) => stepOfField(path) === step),
  );

/** The first step with a problem, where the editor returns before saving; null when all is well. */
export const firstInvalidStep = (form: ProjectFormState): number | null => {
  const steps = Object.keys(projectFormErrors(form))
    .map(stepOfField)
    .filter((step): step is number => step !== null);
  return steps.length > 0 ? Math.min(...steps) : null;
};

/**
 * The body for saving an existing project: the editor's own fields only, so
 * a save here never overwrites milestones, metrics or risks someone changed
 * on another tab meanwhile. Empty optional fields are sent as null, which is
 * how a PATCH says "remove this"; leaving them out would keep the old value.
 *
 * The status is sent only when it was changed here. Sending the status the
 * editor loaded would quietly undo a move someone else made meanwhile, such
 * as restoring a project a colleague had just archived.
 */
export const projectEditBody = (data: ProjectInput, savedStatus: ProjectStatus): ProjectUpdate => ({
  title: data.title,
  slug: data.slug,
  summary: data.summary,
  ...(data.status === savedStatus ? {} : { status: data.status }),
  priority: data.priority,
  leadId: data.leadId ?? null,
  memberIds: data.memberIds,
  startDate: data.startDate ?? null,
  endDate: data.endDate ?? null,
  country: data.country ?? null,
  region: data.region ?? null,
  locationText: data.locationText ?? null,
  programme: data.programme ?? null,
  objectives: data.objectives,
  partners: data.partners,
  sdgs: data.sdgs,
  tags: data.tags,
  description: data.description,
  cover: data.cover ?? null,
  code: data.code ?? null,
});

interface DetailIssue {
  path: string;
  message: string;
}

const isDetailIssue = (value: unknown): value is DetailIssue =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as DetailIssue).path === 'string' &&
  typeof (value as DetailIssue).message === 'string';

/**
 * Where a refused save should send the reader, with the field to mark. The
 * API names fields in its validation details; a slug clash and an inactive
 * colleague arrive as messages, so those are recognised by what they say.
 */
export const serverProblem = (error: unknown): { step: number; errors: FieldErrors } | null => {
  if (!(error instanceof ApiError)) return null;
  const details = Array.isArray(error.details) ? error.details.filter(isDetailIssue) : [];
  const located = details
    .map((issue) => ({ issue, step: stepOfField(issue.path) }))
    .filter((entry): entry is { issue: DetailIssue; step: number } => entry.step !== null);
  if (located.length > 0) {
    const step = Math.min(...located.map((entry) => entry.step));
    return {
      step,
      errors: Object.fromEntries(located.map(({ issue }) => [issue.path, issue.message])),
    };
  }
  if (error.status === 409 && /address/i.test(error.message)) {
    return { step: 0, errors: { slug: error.message } };
  }
  if (error.status === 409 && /cannot move/i.test(error.message)) {
    return { step: 0, errors: { status: error.message } };
  }
  // Only a refused request names a colleague; a server fault never belongs to a field.
  if (error.status !== 400) return null;
  if (/lead/i.test(error.message)) return { step: 1, errors: { leadId: error.message } };
  if (/member/i.test(error.message)) return { step: 1, errors: { memberIds: error.message } };
  return null;
};
