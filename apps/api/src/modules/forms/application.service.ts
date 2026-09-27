import {
  canChangeApplicationStatus,
  newStableId,
  REVIEWABLE_APPLICATION_STATUSES,
  todayKey,
  type AdminApplication,
  type AnswerValue,
  type ApplicationAnswer,
  type ApplicationCounts,
  type ApplicationExport,
  type ApplicationFormRef,
  type ApplicationListItem,
  type ApplicationListQuery,
  type ApplicationRecommendation,
  type ApplicationReviewInput,
  type ApplicationStatusChangeInput,
  type FileAnswer,
  type FormVersionSnapshot,
  type Paginated,
  type PersonSummary,
} from '@iaa/shared';
import { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors.js';
import type { QueryFilter } from '../../common/mongo-types.js';
import { paginate } from '../../common/pagination.js';
import { searchRegex } from '../../common/regex.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import { TOKENS } from '../../tokens.js';
import { AuditService } from '../audit/audit.service.js';
import { PeopleService } from '../people/people.service.js';

import { buildApplicationCsv, exportFields } from './application-export.js';
import {
  currentAsSnapshot,
  isAdmin,
  toSnapshot,
  type Actor,
  type StoredForm,
  type StoredFormVersion,
  type StoredSubmission,
} from './form-mappers.js';
import type { ApplicationReviewRecord, FormSubmissionDocument } from './form-submission.model.js';
import { FormSubmissionModel } from './form-submission.model.js';
import { FormVersionModel } from './form-version.model.js';
import { FormModel } from './form.model.js';

// Stricter than `Types.ObjectId.isValid`, which accepts any 12-character string.
const OBJECT_ID = /^[a-f\d]{24}$/i;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Everything a reviewer can see: never a draft, which is still the applicant's. */
const REVIEWABLE = { $in: [...REVIEWABLE_APPLICATION_STATUSES] };

const LIST_FIELDS =
  'reference formId applicant status submittedAt createdAt updatedAt reviews.recommendation reviews.createdAt';

type FormRefSource = Pick<StoredForm, '_id' | 'title' | 'slug' | 'type'>;

const toFormRef = (form: FormRefSource | undefined, formId: string): ApplicationFormRef =>
  form
    ? { id: form._id.toString(), title: form.title, slug: form.slug, type: form.type }
    : { id: formId, title: 'Deleted form', slug: '', type: 'general' };

const isFileList = (value: unknown): value is FileAnswer[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'object' && item !== null && 'publicId' in item);

/** The most recent review that gave a recommendation. */
const lastRecommendation = (
  reviews: readonly Pick<ApplicationReviewRecord, 'recommendation' | 'createdAt'>[],
): ApplicationRecommendation | undefined =>
  [...reviews]
    .filter((review) => review.recommendation)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    ?.recommendation;

/** One status, several, or every reviewable one; never `draft`, which the schema refuses. */
const statusFilter = (query: Pick<ApplicationListQuery, 'status' | 'statuses'>) => {
  if (query.status) return query.status;
  return query.statuses?.length ? { $in: query.statuses } : REVIEWABLE;
};

/**
 * Submission dates between two calendar days, both inclusive. Days are read
 * in UTC, as every stored calendar date is (plan D6).
 */
const submittedBetween = (from?: string, to?: string): Record<string, Date> | undefined => {
  if (!from && !to) {
    return undefined;
  }
  return {
    ...(from ? { $gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { $lt: new Date(Date.parse(`${to}T00:00:00.000Z`) + DAY_MS) } : {}),
  };
};

/**
 * Reviewing applications (plan §3.4, D2, D4): the lists, the counts behind
 * the tabs and badge, the CSV export, one application with its answers in
 * the order the applicant saw them, status changes and internal reviews.
 *
 * Applicant data is personal data, so the routes guard every call with
 * `applications:read` or `applications:update`, which editors do not get by
 * default (plan D2).
 */
@injectable()
export class ApplicationService {
  constructor(
    @inject(AuditService) private readonly audit: AuditService,
    @inject(PeopleService) private readonly people: PeopleService,
    @inject(TOKENS.MediaProvider) private readonly media: MediaProvider,
  ) {}

  async list(query: ApplicationListQuery): Promise<Paginated<ApplicationListItem>> {
    const filter: QueryFilter<FormSubmissionDocument> = { status: statusFilter(query) };
    if (query.formId) filter.formId = new Types.ObjectId(query.formId);
    if (query.q) {
      const pattern = searchRegex(query.q);
      filter.$or = [
        { reference: pattern },
        { 'applicant.name': pattern },
        { 'applicant.email': pattern },
      ];
    }
    const submittedAt = submittedBetween(query.from, query.to);
    if (submittedAt) filter.submittedAt = submittedAt;

    const direction = query.order === 'asc' ? 1 : -1;
    const sortKey = query.sort === 'updated' ? 'updatedAt' : 'submittedAt';
    const [rows, total] = await Promise.all([
      FormSubmissionModel.find(filter)
        .select(LIST_FIELDS)
        .sort({ [sortKey]: direction, _id: direction })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<StoredSubmission[]>()
        .exec(),
      FormSubmissionModel.countDocuments(filter).exec(),
    ]);
    const forms = await this.formRefs(rows.map((row) => row.formId));
    const items = rows.map((row): ApplicationListItem => ({
      id: row._id.toString(),
      reference: row.reference ?? '',
      form: toFormRef(forms.get(row.formId.toString()), row.formId.toString()),
      applicant: row.applicant ?? {},
      status: row.status,
      submittedAt: (row.submittedAt ?? row.createdAt).toISOString(),
      reviewCount: row.reviews?.length ?? 0,
      ...this.recommendationOf(row),
    }));
    return paginate(items, total, query.page, query.pageSize);
  }

  /** How many applications sit in each reviewable status. */
  async counts(): Promise<ApplicationCounts> {
    const rows = await FormSubmissionModel.aggregate<{ _id: string; count: number }>([
      { $match: { status: REVIEWABLE } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();
    const counts = Object.fromEntries(
      REVIEWABLE_APPLICATION_STATUSES.map((status) => [status, 0]),
    ) as ApplicationCounts;
    for (const row of rows) {
      if ((REVIEWABLE_APPLICATION_STATUSES as readonly string[]).includes(row._id)) {
        counts[row._id as keyof ApplicationCounts] = row.count;
      }
    }
    return counts;
  }

  /**
   * Every submitted application to one form as CSV, oldest first. Columns
   * follow the form's current questions, then any question an earlier
   * version asked, so no answer is left out of the file.
   */
  async exportCsv(formId: string): Promise<ApplicationExport> {
    const form = OBJECT_ID.test(formId)
      ? await FormModel.findById(formId).lean<StoredForm>().exec()
      : null;
    if (!form) {
      throw new NotFoundError('Form');
    }
    const [versions, rows] = await Promise.all([
      FormVersionModel.find({ formId: form._id })
        .sort({ version: -1 })
        .select('steps')
        .lean<Pick<StoredFormVersion, 'steps'>[]>()
        .exec(),
      FormSubmissionModel.find({ formId: form._id, status: REVIEWABLE })
        .sort({ submittedAt: 1, _id: 1 })
        .select('reference status submittedAt applicant answers')
        .lean<StoredSubmission[]>()
        .exec(),
    ]);
    const fields = exportFields([form.steps ?? [], ...versions.map((version) => version.steps)]);
    return {
      filename: `${form.slug}-applications-${todayKey()}.csv`,
      csv: buildApplicationCsv(fields, rows),
    };
  }

  async get(id: string): Promise<AdminApplication> {
    return this.present(await this.load(id));
  }

  /**
   * Move an application along, recording who, when and why. Asking for the
   * status it already has changes nothing, so a retried request is harmless.
   */
  async changeStatus(
    id: string,
    input: ApplicationStatusChangeInput,
    actor: Actor,
  ): Promise<AdminApplication> {
    const application = await this.load(id);
    if (application.status === input.status) {
      return this.present(application);
    }
    if (!canChangeApplicationStatus(application.status, input.status)) {
      throw new ConflictError('This application cannot be moved to that status.');
    }
    const at = new Date();
    const updated = await FormSubmissionModel.findOneAndUpdate(
      { _id: application._id, status: application.status },
      {
        $set: { status: input.status },
        $push: {
          statusHistory: {
            from: application.status,
            to: input.status,
            ...(input.note ? { note: input.note } : {}),
            byId: new Types.ObjectId(actor.id),
            at,
          },
        },
      },
      { returnDocument: 'after' },
    )
      .lean<StoredSubmission>()
      .exec();
    if (!updated) {
      throw new ConflictError(
        'Someone else changed this application while you were reading it. Reload to see the latest.',
      );
    }
    await this.audit.record({
      ...this.entry(updated, actor),
      action: 'status-changed',
      summary: `Moved ${updated.reference ?? 'the application'} from ${application.status} to ${input.status}`,
      changes: [{ field: 'status', from: application.status, to: input.status }],
    });
    return this.present(updated);
  }

  /** An internal review. Never shown to the applicant. */
  async addReview(
    id: string,
    input: ApplicationReviewInput,
    actor: Actor,
  ): Promise<AdminApplication> {
    const application = await this.load(id);
    const review: ApplicationReviewRecord = {
      id: newStableId(),
      reviewerId: new Types.ObjectId(actor.id),
      notes: input.notes,
      ...(input.recommendation ? { recommendation: input.recommendation } : {}),
      ...(input.score ? { score: input.score } : {}),
      createdAt: new Date(),
    };
    const updated = await FormSubmissionModel.findOneAndUpdate(
      { _id: application._id, status: REVIEWABLE },
      { $push: { reviews: review } },
      { returnDocument: 'after' },
    )
      .lean<StoredSubmission>()
      .exec();
    if (!updated) {
      throw new NotFoundError('Application');
    }
    await this.audit.record({
      ...this.entry(updated, actor),
      action: 'reviewed',
      summary: `Reviewed ${updated.reference ?? 'the application'}`,
      ...(input.recommendation
        ? { changes: [{ field: 'recommendation', to: input.recommendation }] }
        : {}),
    });
    return this.present(updated);
  }

  /** Remove a review: the reviewer's own, or any review for an administrator. */
  async removeReview(id: string, reviewId: string, actor: Actor): Promise<void> {
    const application = await this.load(id);
    const review = (application.reviews ?? []).find((candidate) => candidate.id === reviewId);
    if (!review) {
      throw new NotFoundError('Review');
    }
    if (review.reviewerId.toString() !== actor.id && !isAdmin(actor)) {
      throw new ForbiddenError(
        'You can only remove your own reviews. An administrator can remove any review.',
      );
    }
    await FormSubmissionModel.updateOne(
      { _id: application._id },
      { $pull: { reviews: { id: reviewId } } },
    ).exec();
    await this.audit.record({
      ...this.entry(application, actor),
      action: 'updated',
      summary: `Removed a review from ${application.reference ?? 'the application'}`,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async load(id: string): Promise<StoredSubmission> {
    const application = OBJECT_ID.test(id)
      ? await FormSubmissionModel.findOne({ _id: id, status: REVIEWABLE })
          .lean<StoredSubmission>()
          .exec()
      : null;
    if (!application) {
      throw new NotFoundError('Application');
    }
    return application;
  }

  private recommendationOf(row: StoredSubmission): {
    lastRecommendation?: ApplicationRecommendation;
  } {
    const recommendation = lastRecommendation(row.reviews ?? []);
    return recommendation ? { lastRecommendation: recommendation } : {};
  }

  private async formRefs(ids: Types.ObjectId[]): Promise<Map<string, FormRefSource>> {
    const unique = [...new Set(ids.map((id) => id.toString()))];
    if (unique.length === 0) {
      return new Map();
    }
    const forms = await FormModel.find({ _id: { $in: unique } })
      .select('title slug type')
      .lean<FormRefSource[]>()
      .exec();
    return new Map(forms.map((form) => [form._id.toString(), form]));
  }

  /** The questions as the applicant saw them, or the current ones if that version is missing. */
  private async definitionFor(
    application: StoredSubmission,
    form: StoredForm | null,
  ): Promise<FormVersionSnapshot> {
    const version = await FormVersionModel.findOne({
      formId: application.formId,
      version: application.formVersion,
    })
      .lean<StoredFormVersion>()
      .exec();
    if (version) {
      return toSnapshot(version);
    }
    if (form) {
      return currentAsSnapshot(form);
    }
    return {
      formId: application.formId.toString(),
      version: application.formVersion,
      title: 'Deleted form',
      steps: [],
      createdAt: application.createdAt.toISOString(),
    };
  }

  /**
   * A file answer with a signed link in place of the stored one. Applicant
   * files are private, so the stored link does not open; a signed one is
   * made each time the application is read and never stored.
   */
  private signed(value: AnswerValue): AnswerValue {
    if (!isFileList(value)) {
      return value;
    }
    return value.map((file) => ({
      ...file,
      url:
        this.media.signedDeliveryUrl({
          publicId: file.publicId,
          ...(file.resourceType ? { resourceType: file.resourceType } : {}),
          ...(file.format ? { format: file.format } : {}),
          type: 'authenticated',
        }) ?? file.url,
    }));
  }

  /** Answers in the order of the questions the applicant saw, with those questions' labels. */
  private orderedAnswers(
    definition: FormVersionSnapshot,
    application: StoredSubmission,
  ): ApplicationAnswer[] {
    const answers = new Map(
      (application.answers ?? []).map((answer) => [answer.fieldId, answer.value ?? null]),
    );
    const ordered: ApplicationAnswer[] = [];
    for (const step of definition.steps) {
      for (const field of step.fields) {
        if (answers.has(field.id)) {
          ordered.push({
            fieldId: field.id,
            label: field.label,
            stepId: step.id,
            value: this.signed(answers.get(field.id) ?? null),
          });
          answers.delete(field.id);
        }
      }
    }
    // Anything left answers a question this version does not have. Kept, so
    // nothing the applicant sent is hidden from the reviewer.
    for (const [fieldId, value] of answers) {
      ordered.push({ fieldId, label: fieldId, value: this.signed(value) });
    }
    return ordered;
  }

  private async present(application: StoredSubmission): Promise<AdminApplication> {
    const form = await FormModel.findById(application.formId).lean<StoredForm>().exec();
    const definition = await this.definitionFor(application, form);
    const reviews = application.reviews ?? [];
    const history = application.statusHistory ?? [];
    const people = await this.people.summaries([
      ...reviews.map((review) => review.reviewerId),
      ...history.map((change) => change.byId),
    ]);
    const person = (id: { toString(): string } | null | undefined): PersonSummary | null =>
      id ? (people.get(id.toString()) ?? null) : null;
    return {
      id: application._id.toString(),
      reference: application.reference ?? '',
      formId: application.formId.toString(),
      form: toFormRef(form ?? undefined, application.formId.toString()),
      formVersion: application.formVersion,
      definition,
      applicant: application.applicant ?? {},
      answers: this.orderedAnswers(definition, application),
      status: application.status,
      submittedAt: (application.submittedAt ?? application.createdAt).toISOString(),
      ...(application.consent
        ? {
            consent: {
              version: application.consent.version,
              at: new Date(application.consent.at).toISOString(),
            },
          }
        : {}),
      reviews: reviews.map((review) => ({
        id: review.id,
        reviewer: person(review.reviewerId),
        notes: review.notes,
        ...(review.recommendation ? { recommendation: review.recommendation } : {}),
        ...(review.score ? { score: review.score } : {}),
        createdAt: new Date(review.createdAt).toISOString(),
      })),
      statusHistory: history.map((change) => ({
        from: change.from,
        to: change.to,
        ...(change.note ? { note: change.note } : {}),
        by: person(change.byId),
        at: new Date(change.at).toISOString(),
      })),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }

  private entry(application: Pick<StoredSubmission, '_id'>, actor: Actor) {
    return {
      module: 'applications' as const,
      entityType: 'application',
      entityId: application._id,
      actorId: actor.id,
      actorEmail: actor.email,
    };
  }
}
