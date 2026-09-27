import {
  formPublishProblems,
  formTemplate,
  isReservedFormSlug,
  type AuditChange,
  type FileAnswer,
  type FormCreateInput,
  type FormDefinition,
  type FormListItem,
  type FormListQuery,
  type FormStatus,
  type FormUpdate,
  type Paginated,
  type PreviewLink,
} from '@iaa/shared';
import { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors.js';
import type { QueryFilter } from '../../common/mongo-types.js';
import { paginate } from '../../common/pagination.js';
import { createPreviewLink } from '../../common/preview-token.js';
import { escapeRegex, searchRegex } from '../../common/regex.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import { TOKENS } from '../../tokens.js';
import { diffFields } from '../audit/audit-diff.js';
import { AuditService } from '../audit/audit.service.js';
import { PeopleService } from '../people/people.service.js';

import {
  definitionChanged,
  isAdmin,
  settingsFromInput,
  settingsToDto,
  toFormDefinition,
  toFormListItem,
  type Actor,
  type StoredForm,
} from './form-mappers.js';
import { FormSubmissionModel } from './form-submission.model.js';
import { FormVersionModel } from './form-version.model.js';
import { FormModel, type FormDocument } from './form.model.js';

// Stricter than `Types.ObjectId.isValid`, which accepts any 12-character string.
const OBJECT_ID = /^[a-f\d]{24}$/i;

const SLUG_MAX_LENGTH = 120;
const TITLE_MAX_LENGTH = 160;
const COPY_SUFFIX = '-copy';

// Plain fields worth naming in the activity log with their old and new
// values. The questions, introduction and settings are logged by name only:
// their values are long, and the log is for "what changed", not a copy.
const AUDITED_FIELDS = ['title', 'slug', 'type', 'description'] as const;

/** Only submitted applications count; a draft is still the applicant's. */
const SUBMITTED = { $ne: 'draft' } as const;

type StatusMove = (form: StoredForm, actor: Actor, now: Date) => Promise<StoredForm>;

const isFileList = (value: unknown): value is FileAnswer[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'object' && item !== null && 'publicId' in item);

/**
 * Reasons a form cannot be published, as sentences an editor can act on.
 *
 * `formPublishProblems` plus one check it cannot make without a clock: a
 * closing date that has already passed would publish a page that takes no
 * answers, which is never what the person pressing Publish meant.
 */
export const publishBlockers = (form: StoredForm, now: Date): string[] => {
  const settings = settingsToDto(form.settings);
  const problems = formPublishProblems({ title: form.title, steps: form.steps ?? [], settings });
  if (settings.closesAt && Date.parse(settings.closesAt) <= now.getTime()) {
    problems.push('The closing date has passed. Move it later or clear it.');
  }
  return problems;
};

// Which part of the editor each publishing problem belongs to, so the
// dashboard can send the editor to the step that fixes it. Anything not
// listed is about the questions.
const LIVE_PROBLEM_PATHS: Readonly<Record<string, string>> = {
  'Give the form a title.': 'title',
  'The closing date must be after the opening date.': 'settings.closesAt',
};

/**
 * Why an edit cannot be saved to a published form, as validation details.
 *
 * A live form was checked by an administrator when it was published (plan
 * D2), and every applicant from now on is checked against what is saved. An
 * edit that leaves it with no questions, a condition on a later question or a
 * choice with no options would put a broken page in front of the public
 * without anyone publishing it, so a live form must stay publishable.
 * Returns nothing for a form that is not live, or an edit that touches
 * nothing publishing depends on.
 */
export const liveEditProblems = (
  before: StoredForm,
  input: FormUpdate,
): { path: string; message: string }[] => {
  const touches =
    input.title !== undefined || input.steps !== undefined || input.settings !== undefined;
  if (before.status !== 'published' || !touches) {
    return [];
  }
  const settings = input.settings ?? settingsToDto(before.settings);
  return formPublishProblems({
    title: input.title ?? before.title,
    steps: input.steps ?? before.steps ?? [],
    settings,
  }).map((message) => ({ path: LIVE_PROBLEM_PATHS[message] ?? 'steps', message }));
};

/**
 * The `$set` and `$unset` for an edit. Null clears the internal note or the
 * introduction; anything absent is left as it is.
 */
const updateDocument = (
  input: FormUpdate,
  actor: Actor,
): { set: Record<string, unknown>; unset: Record<string, 1> } => {
  const set: Record<string, unknown> = { updatedBy: new Types.ObjectId(actor.id) };
  const unset: Record<string, 1> = {};
  for (const field of ['title', 'slug', 'type', 'steps'] as const) {
    if (input[field] !== undefined) set[field] = input[field];
  }
  for (const field of ['description', 'intro'] as const) {
    if (input[field] === null) unset[field] = 1;
    else if (input[field] !== undefined) set[field] = input[field];
  }
  if (input.settings !== undefined) set.settings = settingsFromInput(input.settings);
  return { set, unset };
};

/** What an edit changed, for the activity log. */
const updateChanges = (
  before: StoredForm,
  input: FormUpdate,
  { questionsChanged, introChanged }: { questionsChanged: boolean; introChanged: boolean },
): AuditChange[] => {
  const changes = diffFields(before, input, AUDITED_FIELDS);
  if (questionsChanged) changes.push({ field: 'questions' });
  if (introChanged) changes.push({ field: 'introduction' });
  if (
    input.settings !== undefined &&
    definitionChanged(before.settings, settingsFromInput(input.settings))
  ) {
    changes.push({ field: 'settings' });
  }
  return changes;
};

/**
 * The form builder (plan §3.4, D5, D14): creating, editing, publishing,
 * archiving, duplicating, previewing and deleting forms.
 *
 * Publishing is the one step behind the Admin role (plan D2): it opens a
 * public page that collects personal data.
 */
@injectable()
export class FormService {
  // eslint-disable-next-line max-params
  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(AuditService) private readonly audit: AuditService,
    @inject(PeopleService) private readonly people: PeopleService,
    @inject(TOKENS.MediaProvider) private readonly media: MediaProvider,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /** A page of forms, newest change first, each with its number of applications. */
  async list(query: FormListQuery): Promise<Paginated<FormListItem>> {
    const filter: QueryFilter<FormDocument> = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.archived) {
      filter.archivedAt = { $type: 'date' };
    } else if (!query.includeArchived) {
      // Matches a missing value as well as null.
      filter.archivedAt = null;
    }
    if (query.q) {
      filter.$or = [{ title: searchRegex(query.q) }, { slug: searchRegex(query.q) }];
    }
    const [forms, total] = await Promise.all([
      FormModel.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<StoredForm[]>()
        .exec(),
      FormModel.countDocuments(filter).exec(),
    ]);
    const counts = await this.submissionCounts(forms.map((form) => form._id));
    return paginate(
      forms.map((form) => toFormListItem(form, counts.get(form._id.toString()) ?? 0)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(id: string): Promise<FormDefinition> {
    return this.present(await this.load(id));
  }

  /**
   * A new draft form. With a template, the template supplies the type,
   * introduction, settings and questions, and the request supplies the title,
   * address and internal note.
   */
  async create(input: FormCreateInput, actor: Actor): Promise<FormDefinition> {
    await this.ensureSlugFree(input.slug);
    const base = input.template
      ? { ...formTemplate(input.template), title: input.title }
      : {
          title: input.title,
          type: input.type,
          intro: input.intro,
          settings: input.settings,
          steps: input.steps,
        };
    const actorId = new Types.ObjectId(actor.id);
    const created = await FormModel.create({
      title: base.title,
      slug: input.slug,
      type: base.type,
      ...(input.description ? { description: input.description } : {}),
      ...(base.intro ? { intro: base.intro } : {}),
      settings: settingsFromInput(base.settings),
      steps: base.steps,
      status: 'draft',
      version: 1,
      createdBy: actorId,
      updatedBy: actorId,
    });
    const form = created.toObject() as unknown as StoredForm;
    await this.audit.record({
      ...this.entry(form, actor),
      action: 'created',
      summary: input.template
        ? `Created "${form.title}" from a template`
        : `Created "${form.title}"`,
    });
    return this.present(form);
  }

  /**
   * Save changes. `settings`, `intro` and `steps` are replaced whole.
   *
   * When the questions or introduction change, the form moves to a new
   * version (plan D14). A published form is snapshotted at once, so every
   * applicant from now on is checked against, and shown with, exactly what
   * they saw. A form that is not live only moves on when its current
   * version has already been snapshotted; publishing snapshots the rest.
   */
  async update(id: string, input: FormUpdate, actor: Actor): Promise<FormDefinition> {
    const before = await this.load(id);
    const liveProblems = liveEditProblems(before, input);
    if (liveProblems.length > 0) {
      throw new ValidationError(
        'This form is live, so it has to stay ready to take applications',
        liveProblems,
      );
    }
    if (input.slug !== undefined && input.slug !== before.slug) {
      await this.ensureSlugFree(input.slug, before._id);
    }
    const { set, unset } = updateDocument(input, actor);
    const questionsChanged =
      input.steps !== undefined && definitionChanged(before.steps, input.steps);
    const introChanged = input.intro !== undefined && definitionChanged(before.intro, input.intro);
    const version =
      questionsChanged || introChanged ? await this.nextVersion(before) : before.version;
    set.version = version;

    // Guarded on the version and status read above: two people saving the
    // same form at once cannot both claim the next version, and a form
    // published between the read and the write is not given new questions
    // without the snapshot (and the checks above) a live form needs.
    const after = await FormModel.findOneAndUpdate(
      { _id: before._id, version: before.version, status: before.status },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: 'after', runValidators: true },
    )
      .lean<StoredForm>()
      .exec();
    if (!after) {
      throw new ConflictError(
        'Someone else saved this form while you were editing. Reload it and make your changes again.',
      );
    }
    if (after.status === 'published' && version !== before.version) {
      await this.snapshot(after, actor);
    }
    await this.audit.record({
      ...this.entry(after, actor),
      action: 'updated',
      summary:
        version === before.version
          ? `Updated "${after.title}"`
          : `Updated "${after.title}" (now version ${version})`,
      changes: updateChanges(before, input, { questionsChanged, introChanged }),
    });
    return this.present(after);
  }

  /**
   * Publish, close, reopen or return a form to draft. Administrators only.
   * Asking for the status a form already has changes nothing, so a retried
   * request is harmless.
   */
  async changeStatus(id: string, status: FormStatus, actor: Actor): Promise<FormDefinition> {
    if (!isAdmin(actor)) {
      throw new ForbiddenError('Only an administrator can publish, close or reopen a form.');
    }
    const form = await this.load(id);
    if (form.status === status) {
      // A retried publish also repairs a missing snapshot: if writing it
      // failed the first time, the form is live but its applicants would be
      // shown against whatever the questions later become.
      if (status === 'published') await this.snapshot(form, actor);
      return this.present(form);
    }
    if (form.archivedAt) {
      throw new ConflictError('Restore this form from the archive before changing its status.');
    }
    const moves: Record<FormStatus, StatusMove> = {
      published: (current, who, now) => this.publish(current, who, now),
      closed: (current, who, now) => this.close(current, who, now),
      draft: (current, who, now) => this.returnToDraft(current, who, now),
    };
    return this.present(await moves[status](form, actor, new Date()));
  }

  /**
   * Archive or restore. A published form must be closed first, because
   * archiving takes its page down and taking a live form offline is an
   * administrator's decision.
   */
  async setArchived(id: string, archived: boolean, actor: Actor): Promise<FormDefinition> {
    const form = await this.load(id);
    if (Boolean(form.archivedAt) === archived) {
      return this.present(form);
    }
    if (archived && form.status === 'published') {
      throw new ConflictError(
        'Close this form before archiving it. Only an administrator can close a published form.',
      );
    }
    const update = archived
      ? { $set: { archivedAt: new Date(), updatedBy: new Types.ObjectId(actor.id) } }
      : { $unset: { archivedAt: 1 }, $set: { updatedBy: new Types.ObjectId(actor.id) } };
    const after = await this.write(form, update);
    await this.audit.record({
      ...this.entry(after, actor),
      action: archived ? 'archived' : 'restored',
      summary: archived
        ? `Archived "${after.title}"`
        : `Restored "${after.title}" from the archive`,
    });
    return this.present(after);
  }

  /**
   * A copy of a form as a new draft, at version 1, under the first free
   * address of the form `<slug>-copy`, `<slug>-copy-2` and so on.
   */
  async duplicate(id: string, actor: Actor): Promise<FormDefinition> {
    const source = await this.load(id);
    const slug = await this.freeCopySlug(source.slug);
    const actorId = new Types.ObjectId(actor.id);
    const created = await FormModel.create({
      title: `${source.title} (copy)`.slice(0, TITLE_MAX_LENGTH),
      slug,
      type: source.type,
      ...(source.description ? { description: source.description } : {}),
      ...(source.intro ? { intro: source.intro } : {}),
      settings: source.settings,
      steps: source.steps ?? [],
      status: 'draft',
      version: 1,
      createdBy: actorId,
      updatedBy: actorId,
    });
    const form = created.toObject() as unknown as StoredForm;
    await this.audit.record({
      ...this.entry(form, actor),
      action: 'created',
      summary: `Created "${form.title}" as a copy of "${source.title}"`,
    });
    return this.present(form);
  }

  /** A two-hour link to the real public page, whatever the form's status (plan D10). */
  async preview(id: string): Promise<PreviewLink> {
    const form = await this.load(id);
    return createPreviewLink({ kind: 'form', id: form._id.toString() }, this.config);
  }

  /**
   * Delete a form nobody has applied through, with its versions and any
   * drafts in progress. Once there is an application it is kept: close or
   * archive it instead (plan D5).
   */
  async remove(id: string, actor: Actor): Promise<void> {
    const form = await this.load(id);
    if ((await this.submittedCount(form._id)) > 0) {
      throw new ConflictError(
        'People have applied through this form, so it cannot be deleted. Close or archive it instead.',
      );
    }
    const drafts = await FormSubmissionModel.find({ formId: form._id, status: 'draft' })
      .select('answers')
      .lean<{ answers?: { value: unknown }[] }[]>()
      .exec();
    await Promise.all([
      FormModel.deleteOne({ _id: form._id }).exec(),
      FormVersionModel.deleteMany({ formId: form._id }).exec(),
      FormSubmissionModel.deleteMany({ formId: form._id, status: 'draft' }).exec(),
    ]);
    // Files uploaded to unfinished drafts go too; nobody can reach them now.
    const files = drafts.flatMap((draft) =>
      (draft.answers ?? []).flatMap((answer) => (isFileList(answer.value) ? answer.value : [])),
    );
    await Promise.all(
      files.map((file) =>
        this.media.destroyAsset({
          publicId: file.publicId,
          ...(file.resourceType ? { resourceType: file.resourceType } : {}),
        }),
      ),
    );
    await this.audit.record({
      ...this.entry(form, actor),
      action: 'deleted',
      summary: `Deleted "${form.title}"`,
    });
  }

  // ── Status moves ──────────────────────────────────────────────────────

  private async publish(form: StoredForm, actor: Actor, now: Date): Promise<StoredForm> {
    const problems = publishBlockers(form, now);
    if (problems.length > 0) {
      throw new ValidationError(
        'This form is not ready to publish',
        problems.map((message) => ({ path: 'form', message })),
      );
    }
    const after = await this.write(form, {
      $set: { status: 'published', publishedAt: now, updatedBy: new Types.ObjectId(actor.id) },
      $unset: { closedAt: 1 },
    });
    await this.snapshot(after, actor);
    await this.audit.record({
      ...this.entry(after, actor),
      action: 'published',
      summary:
        form.status === 'closed'
          ? `Reopened "${after.title}" for applications`
          : `Published "${after.title}"`,
      changes: [{ field: 'status', from: form.status, to: 'published' }],
    });
    return after;
  }

  private async close(form: StoredForm, actor: Actor, now: Date): Promise<StoredForm> {
    if (form.status !== 'published') {
      throw new ConflictError('Only a published form can be closed.');
    }
    const after = await this.write(form, {
      $set: { status: 'closed', closedAt: now, updatedBy: new Types.ObjectId(actor.id) },
    });
    await this.audit.record({
      ...this.entry(after, actor),
      action: 'status-changed',
      summary: `Closed "${after.title}" to new applications`,
      changes: [{ field: 'status', from: form.status, to: 'closed' }],
    });
    return after;
  }

  private async returnToDraft(form: StoredForm, actor: Actor, _now: Date): Promise<StoredForm> {
    if ((await this.submittedCount(form._id)) > 0) {
      throw new ConflictError(
        'People have already applied through this form, so it cannot go back to draft. Close it instead.',
      );
    }
    const after = await this.write(form, {
      $set: { status: 'draft', updatedBy: new Types.ObjectId(actor.id) },
      $unset: { publishedAt: 1, closedAt: 1 },
    });
    await this.audit.record({
      ...this.entry(after, actor),
      action: 'unpublished',
      summary: `Took "${after.title}" back to draft`,
      changes: [{ field: 'status', from: form.status, to: 'draft' }],
    });
    return after;
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async load(id: string): Promise<StoredForm> {
    const form = OBJECT_ID.test(id) ? await FormModel.findById(id).lean<StoredForm>().exec() : null;
    if (!form) {
      throw new NotFoundError('Form');
    }
    return form;
  }

  /**
   * Apply an update only if the form is still in the status it was read in,
   * so two administrators pressing different buttons at once cannot leave a
   * form half-published.
   */
  private async write(form: StoredForm, update: Record<string, unknown>): Promise<StoredForm> {
    const after = await FormModel.findOneAndUpdate({ _id: form._id, status: form.status }, update, {
      returnDocument: 'after',
    })
      .lean<StoredForm>()
      .exec();
    if (!after) {
      throw new ConflictError(
        'This form changed while you were working on it. Reload it and try again.',
      );
    }
    return after;
  }

  private async present(form: StoredForm): Promise<FormDefinition> {
    const [count, people] = await Promise.all([
      this.submittedCount(form._id),
      this.people.summaries([form.createdBy, form.updatedBy]),
    ]);
    return toFormDefinition(form, count, people);
  }

  private submittedCount(formId: Types.ObjectId): Promise<number> {
    return FormSubmissionModel.countDocuments({ formId, status: SUBMITTED }).exec();
  }

  /** Submitted applications per form, for a page of forms, in one query. */
  private async submissionCounts(formIds: Types.ObjectId[]): Promise<Map<string, number>> {
    if (formIds.length === 0) {
      return new Map();
    }
    const rows = await FormSubmissionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { formId: { $in: formIds }, status: SUBMITTED } },
      { $group: { _id: '$formId', count: { $sum: 1 } } },
    ]).exec();
    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }

  private async ensureSlugFree(slug: string, exceptId?: Types.ObjectId): Promise<void> {
    if (isReservedFormSlug(slug)) {
      throw new ValidationError('That address is taken by the public site', [
        {
          path: 'slug',
          message: `"${slug}" is used by the public site for previews. Choose a different address.`,
        },
      ]);
    }
    const clash = await FormModel.exists({
      slug,
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    }).exec();
    if (clash) {
      throw new ConflictError(
        `Another form already uses the address "${slug}". Choose a different one.`,
      );
    }
  }

  private async freeCopySlug(slug: string): Promise<string> {
    // Room for "-copy" and a number, within the slug limit.
    const base = `${slug.slice(0, SLUG_MAX_LENGTH - COPY_SUFFIX.length - 4).replace(/-+$/, '')}${COPY_SUFFIX}`;
    const taken = new Set(
      (
        await FormModel.find({ slug: new RegExp(`^${escapeRegex(base)}(?:-\\d+)?$`) })
          .select('slug')
          .lean<{ slug: string }[]>()
          .exec()
      ).map((form) => form.slug),
    );
    if (!taken.has(base)) {
      return base;
    }
    let suffix = 2;
    while (taken.has(`${base}-${suffix}`)) {
      suffix += 1;
    }
    return `${base}-${suffix}`;
  }

  /**
   * The version a changed form moves to: the next one when the current
   * version is live or already snapshotted, otherwise the same one, since
   * nobody has seen it yet.
   */
  private async nextVersion(form: StoredForm): Promise<number> {
    if (form.status === 'published') {
      return form.version + 1;
    }
    const snapshotted = await FormVersionModel.exists({
      formId: form._id,
      version: form.version,
    }).exec();
    return snapshotted ? form.version + 1 : form.version;
  }

  /**
   * Record the form's questions at its current version. Written once and
   * never changed: a repeat (a retried publish) leaves the first in place.
   */
  private async snapshot(form: StoredForm, actor: Actor): Promise<void> {
    try {
      await FormVersionModel.updateOne(
        { formId: form._id, version: form.version },
        {
          $setOnInsert: {
            title: form.title,
            ...(form.intro ? { intro: form.intro } : {}),
            steps: form.steps ?? [],
            createdBy: new Types.ObjectId(actor.id),
          },
        },
        { upsert: true },
      ).exec();
    } catch (err) {
      this.logger.error(
        { err, module: 'forms', entityId: form._id.toString(), version: form.version },
        'Failed to snapshot a form version',
      );
      throw err;
    }
  }

  private entry(form: Pick<StoredForm, '_id'>, actor: Actor) {
    return {
      module: 'forms' as const,
      entityType: 'form',
      entityId: form._id,
      actorId: actor.id,
      actorEmail: actor.email,
    };
  }
}
