import {
  newStableId,
  PROJECT_DOCUMENT_LIMIT,
  PROJECT_MEDIA_LIMIT,
  todayKey,
  type AuditAction,
  type AuditChange,
  type AuditEvent,
  type FileAttachment,
  type Paginated,
  type Project,
  type ProjectDocumentInput,
  type ProjectInput,
  type ProjectListItem,
  type ProjectListQuery,
  type ProjectMediaInput,
  type ProjectMediaItem,
  type ProjectMediaUpdate,
  type ProjectTaskCounts,
  type ProjectUpdate,
} from '@iaa/shared';
import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { ConflictError, NotFoundError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { FileAttachmentRecord } from '../../common/work-model-helpers.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';
import { diffFields } from '../audit/audit-diff.js';
import { AuditService } from '../audit/audit.service.js';
import { ImpactStoryModel } from '../impact-stories/impact-story.model.js';
import { PeopleService } from '../people/people.service.js';
import { TaskModel } from '../tasks/task.model.js';

import {
  actorObjectId,
  applyMediaPatch,
  AUDITED_PROJECT_FIELDS,
  buildProjectCreate,
  buildProjectUpdate,
  deleteRefusal,
  mediaPatchOperators,
  mediaUpdateSummary,
  removedMilestoneIds,
  statusAuditAction,
  statusAuditSummary,
  toCalendarDay,
  updateAuditSummary,
  type StoredProject,
} from './project-changes.js';
import {
  auditView,
  EMPTY_TASK_COUNTS,
  peopleIn,
  toDocument,
  toMediaItem,
  toProjectDto,
  toProjectListItem,
  type PeopleMap,
} from './project-dto.js';
import {
  LIST_COLLATION,
  projectListFilter,
  projectListPipeline,
  taskCountsPipeline,
  type TaskCountRow,
} from './project-query.js';
import { ProjectModel, type ProjectMediaRecord } from './project.model.js';

/** Who is making a change: always from the verified token, never the body. */
export interface ProjectActor {
  id: string;
  email: string;
}

/** One line for the project's activity log. */
interface ProjectAuditEntry {
  entityId: Types.ObjectId | string;
  action: AuditAction;
  summary: string;
  changes?: AuditChange[];
}

/** A photo or document to add, and the limit its list must stay within. */
interface EvidencePush {
  list: 'media' | 'documents';
  item: ProjectMediaRecord | FileAttachmentRecord;
  limit: number;
  /** What the list holds, for the "limit reached" message. */
  noun: string;
}

const AUDITED_FIELD_NAMES = Object.keys(AUDITED_PROJECT_FIELDS);

// The photo details a PATCH can change, compared for the activity log.
const MEDIA_DETAIL_FIELDS = ['caption', 'takenOn', 'shareable'] as const;

const notFound = (): NotFoundError => new NotFoundError('Project');

/**
 * Projects (plan §3.2): the working record of an initiative, its evidence and
 * its progress. Every change is logged to the audit trail with the actor from
 * the route. Nothing here is public.
 */
@injectable()
export class ProjectService {
  constructor(
    @inject(PeopleService) private readonly people: PeopleService,
    @inject(AuditService) private readonly audit: AuditService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /** A page of projects, each with its progress and task counts. */
  async list(
    query: ProjectListQuery,
    actor: ProjectActor,
    today: string = todayKey(),
  ): Promise<Paginated<ProjectListItem>> {
    const filter = projectListFilter(query, actor.id);
    const aggregate = ProjectModel.aggregate<StoredProject>(
      projectListPipeline(filter, query.sort, query.page, query.pageSize),
    );
    // Only the title sort needs the case-insensitive collation; the others
    // keep the default so they can use the indexes built with it.
    if (query.sort === 'title') aggregate.collation(LIST_COLLATION);
    const [records, total] = await Promise.all([
      aggregate.exec(),
      ProjectModel.countDocuments(filter).exec(),
    ]);
    const [counts, people] = await Promise.all([
      this.taskCounts(
        records.map((record) => record._id),
        today,
      ),
      this.people.summaries(records.map((record) => record.leadId)),
    ]);
    const items = records.map((record) =>
      toProjectListItem(record, people, counts.get(record._id.toString()) ?? EMPTY_TASK_COUNTS),
    );
    return paginate(items, total, query.page, query.pageSize);
  }

  /** One project as its detail page shows it. */
  async get(id: string, today: string = todayKey()): Promise<Project> {
    return this.present(await this.find(id), today);
  }

  /** Creates a project; the creator is the signed-in user. */
  async create(input: ProjectInput, actor: ProjectActor): Promise<Project> {
    await this.assertSlugFree(input.slug);
    await this.assertPeople(input, null);
    const doc = buildProjectCreate(input, actor.id, new Date());
    const created = await ProjectModel.create(doc);
    const record = created.toObject() as StoredProject;
    await this.record(actor, {
      entityId: record._id,
      action: 'created',
      summary: `Created the project "${record.title}"`,
    });
    return this.present(record);
  }

  /**
   * Applies a PATCH. Status moves are checked against the lifecycle, and the
   * write only lands if the status is still what the check saw, so two people
   * moving the same project at once cannot slip past the rules.
   */
  async update(id: string, patch: ProjectUpdate, actor: ProjectActor): Promise<Project> {
    const before = await this.find(id);
    const write = buildProjectUpdate(before, patch, actor.id, new Date());
    if (patch.slug !== undefined && patch.slug !== before.slug) {
      await this.assertSlugFree(patch.slug, before._id);
    }
    await this.assertPeople(patch, before);
    const statusChanges = patch.status !== undefined && patch.status !== before.status;
    const updated = await ProjectModel.findOneAndUpdate(
      statusChanges ? { _id: before._id, status: before.status } : { _id: before._id },
      write,
      { returnDocument: 'after', runValidators: true },
    )
      .lean<StoredProject>()
      .exec();
    if (!updated) {
      throw statusChanges && (await ProjectModel.exists({ _id: before._id }))
        ? new ConflictError(
            'Someone else changed this project’s status just now. Reload it and try again.',
          )
        : notFound();
    }
    await this.unlinkRemovedMilestones(before, patch);
    await this.auditUpdate(before, patch, actor);
    return this.present(updated);
  }

  /**
   * Deletes a project nothing points at. Tasks and stories keep a project's
   * id, so deleting one they reference would leave them pointing at nothing:
   * those are refused with the advice to archive instead (plan D5).
   */
  async remove(id: string, actor: ProjectActor): Promise<void> {
    const project = await this.find(id);
    const [tasks, stories] = await Promise.all([
      TaskModel.countDocuments({ projectId: project._id }).exec(),
      ImpactStoryModel.countDocuments({ projectId: project._id }).exec(),
    ]);
    const refusal = deleteRefusal(tasks, stories);
    if (refusal) throw new ConflictError(refusal);
    await ProjectModel.deleteOne({ _id: project._id }).exec();
    await this.record(actor, {
      entityId: project._id,
      action: 'deleted',
      summary: `Deleted the project "${project.title}"`,
    });
  }

  /**
   * Adds a photo as evidence. `$push` with a guard on the limit in the same
   * write, so two people adding photos at once neither overwrite each other
   * nor slip past the limit together.
   */
  async addMedia(
    id: string,
    input: ProjectMediaInput,
    actor: ProjectActor,
  ): Promise<ProjectMediaItem> {
    const item: ProjectMediaRecord = {
      id: newStableId('photo'),
      image: input.image,
      ...(input.caption ? { caption: input.caption } : {}),
      ...(input.takenOn ? { takenOn: toCalendarDay(input.takenOn) } : {}),
      shareable: input.shareable,
      addedBy: actorObjectId(actor.id) ?? null,
      addedAt: new Date(),
    };
    await this.pushWithLimit(
      id,
      { list: 'media', item, limit: PROJECT_MEDIA_LIMIT, noun: 'photos' },
      actor,
    );
    const summary = input.shareable
      ? 'Added a photo, cleared for public use'
      : 'Added a photo, not cleared for public use';
    await this.record(actor, {
      entityId: id,
      action: 'media-added',
      summary: item.caption ? `${summary}: ${item.caption}` : summary,
    });
    return toMediaItem(item, await this.people.summaries([item.addedBy]));
  }

  /** Edits a photo's caption, date or consent, in place. */
  async updateMedia(
    id: string,
    itemId: string,
    patch: ProjectMediaUpdate,
    actor: ProjectActor,
  ): Promise<ProjectMediaItem> {
    const before = await ProjectModel.findOneAndUpdate(
      { _id: id, 'media.id': itemId },
      mediaPatchOperators(patch, actor.id),
      { returnDocument: 'before', projection: { media: { $elemMatch: { id: itemId } } } },
    )
      .lean<Pick<StoredProject, '_id' | 'media'>>()
      .exec();
    const previous = before?.media?.[0];
    if (!previous) throw await this.missing(id, 'Photo');

    const after = applyMediaPatch(previous, patch);
    const changes = diffFields(previous, after, MEDIA_DETAIL_FIELDS);
    if (changes.length > 0) {
      await this.record(actor, {
        entityId: id,
        action: 'updated',
        summary: mediaUpdateSummary(previous, after),
        changes,
      });
    }
    return toMediaItem(after, await this.people.summaries([after.addedBy]));
  }

  /** Removes a photo from the project's evidence. */
  async removeMedia(id: string, itemId: string, actor: ProjectActor): Promise<void> {
    const removed = await this.pullItem(id, 'media', itemId, actor);
    const item = removed as ProjectMediaRecord | undefined;
    if (!item) throw await this.missing(id, 'Photo');
    await this.record(actor, {
      entityId: id,
      action: 'media-removed',
      summary: item.caption ? `Removed a photo: ${item.caption}` : 'Removed a photo',
    });
  }

  /** Attaches a document. Guarded like photos; see `addMedia`. */
  async addDocument(
    id: string,
    input: ProjectDocumentInput,
    actor: ProjectActor,
  ): Promise<FileAttachment> {
    const item: FileAttachmentRecord = {
      id: newStableId('doc'),
      name: input.name,
      file: input.file,
      addedBy: actorObjectId(actor.id) ?? null,
      addedAt: new Date(),
    };
    await this.pushWithLimit(
      id,
      { list: 'documents', item, limit: PROJECT_DOCUMENT_LIMIT, noun: 'documents' },
      actor,
    );
    await this.record(actor, {
      entityId: id,
      action: 'document-added',
      summary: `Attached ${item.name}`,
    });
    return toDocument(item, await this.people.summaries([item.addedBy]));
  }

  /** Removes a document from the project. */
  async removeDocument(id: string, documentId: string, actor: ProjectActor): Promise<void> {
    const removed = await this.pullItem(id, 'documents', documentId, actor);
    const item = removed as FileAttachmentRecord | undefined;
    if (!item) throw await this.missing(id, 'Document');
    await this.record(actor, {
      entityId: id,
      action: 'document-removed',
      summary: `Removed ${item.name}`,
    });
  }

  /** The project's activity log, newest first. */
  async activity(id: string, page: number, pageSize: number): Promise<Paginated<AuditEvent>> {
    if (!(await ProjectModel.exists({ _id: id }))) throw notFound();
    return this.audit.list('project', id, page, pageSize);
  }

  // -------------------------------------------------------------------------

  private async find(id: string): Promise<StoredProject> {
    const record = await ProjectModel.findById(id).lean<StoredProject>().exec();
    if (!record) throw notFound();
    return record;
  }

  /** A missing item inside a project, or the project itself when that is what is missing. */
  private async missing(id: string, item: string): Promise<NotFoundError> {
    return (await ProjectModel.exists({ _id: id })) ? new NotFoundError(item) : notFound();
  }

  private async present(record: StoredProject, today: string = todayKey()): Promise<Project> {
    const evidence = [...(record.media ?? []), ...(record.documents ?? [])];
    const [counts, storyCount, people, active] = await Promise.all([
      this.taskCounts([record._id], today),
      ImpactStoryModel.countDocuments({ projectId: record._id }).exec(),
      this.people.summaries([
        record.leadId,
        record.createdBy,
        record.updatedBy,
        ...evidence.map((item) => item.addedBy),
      ]),
      // Members who have left drop off the team list; see `Project.members`.
      this.people.summaries(record.memberIds ?? [], { activeOnly: true }),
    ]);
    const members = (record.memberIds ?? [])
      .map((memberId) => active.get(memberId.toString()))
      .filter((member) => member !== undefined);
    return toProjectDto(record, {
      people,
      members,
      taskCounts: counts.get(record._id.toString()) ?? EMPTY_TASK_COUNTS,
      storyCount,
    });
  }

  /** Task counts for each project, in one aggregate. */
  private async taskCounts(
    projectIds: Types.ObjectId[],
    today: string,
  ): Promise<Map<string, ProjectTaskCounts>> {
    if (projectIds.length === 0) return new Map();
    const rows = await TaskModel.aggregate<TaskCountRow>(
      taskCountsPipeline(projectIds, today),
    ).exec();
    return new Map(
      rows.map((row) => [
        row._id.toString(),
        { total: row.total, done: row.done, open: row.total - row.done, overdue: row.overdue },
      ]),
    );
  }

  private async assertSlugFree(slug: string, except?: Types.ObjectId): Promise<void> {
    const taken = await ProjectModel.exists(except ? { slug, _id: { $ne: except } } : { slug });
    if (taken) {
      throw new ConflictError(
        `Another project already uses the address "${slug}". Choose a different one.`,
      );
    }
  }

  /**
   * Refuses a lead or members who are not active colleagues. Only people
   * being added are checked: someone who left after joining the project must
   * not stop the rest of it from being edited.
   */
  private async assertPeople(
    input: Pick<ProjectUpdate, 'leadId' | 'memberIds'>,
    before: StoredProject | null,
  ): Promise<void> {
    const currentLead = before?.leadId?.toString();
    if (input.leadId && input.leadId !== currentLead) {
      await this.people.assertActive([input.leadId], 'The project lead');
    }
    if (input.memberIds) {
      const current = new Set((before?.memberIds ?? []).map((memberId) => memberId.toString()));
      const added = input.memberIds.filter((memberId) => !current.has(memberId));
      await this.people.assertActive(added, 'Project members');
    }
  }

  private async pushWithLimit(
    id: string,
    { list, item, limit, noun }: EvidencePush,
    actor: ProjectActor,
  ): Promise<void> {
    const actorId = actorObjectId(actor.id);
    const pushed = await ProjectModel.updateOne(
      // The list is full when its last allowed slot is taken.
      { _id: id, [`${list}.${limit - 1}`]: { $exists: false } },
      { $push: { [list]: item }, ...(actorId ? { $set: { updatedBy: actorId } } : {}) },
    ).exec();
    if (pushed.matchedCount === 0) {
      if (!(await ProjectModel.exists({ _id: id }))) throw notFound();
      throw new ConflictError(
        `This project already holds ${limit} ${noun}, the most it can keep. Remove one first.`,
      );
    }
  }

  /** Pulls one item out of a list and returns it as it was, or undefined when it was not there. */
  private async pullItem(
    id: string,
    list: 'media' | 'documents',
    itemId: string,
    actor: ProjectActor,
  ): Promise<ProjectMediaRecord | FileAttachmentRecord | undefined> {
    const actorId = actorObjectId(actor.id);
    const before = await ProjectModel.findOneAndUpdate(
      { _id: id, [`${list}.id`]: itemId },
      { $pull: { [list]: { id: itemId } }, ...(actorId ? { $set: { updatedBy: actorId } } : {}) },
      { returnDocument: 'before', projection: { [list]: { $elemMatch: { id: itemId } } } },
    )
      .lean<Pick<StoredProject, 'media' | 'documents'>>()
      .exec();
    return before?.[list]?.[0];
  }

  /**
   * Clears the milestone from tasks that pointed at one this PATCH removed.
   * The tasks stay on the project; they just no longer name a milestone that
   * is gone, which the task editor would otherwise refuse to save. Best
   * effort: the project is already saved, so a failure here is logged rather
   * than reported as a failed save.
   */
  private async unlinkRemovedMilestones(
    before: StoredProject,
    patch: ProjectUpdate,
  ): Promise<void> {
    const removed = removedMilestoneIds(before, patch);
    if (removed.length === 0) return;
    try {
      await TaskModel.updateMany(
        { projectId: before._id, milestoneId: { $in: removed } },
        { $unset: { milestoneId: 1 } },
      ).exec();
    } catch (err) {
      this.logger.error(
        { err, module: 'projects', entityId: before._id.toString() },
        'Could not unlink tasks from removed milestones',
      );
    }
  }

  private async auditUpdate(
    before: StoredProject,
    patch: ProjectUpdate,
    actor: ProjectActor,
  ): Promise<void> {
    const { status, ...fields } = patch;
    if (status !== undefined && status !== before.status) {
      await this.record(actor, {
        entityId: before._id,
        action: statusAuditAction(before.status, status),
        summary: statusAuditSummary(before.status, status),
        changes: [{ field: 'status', from: before.status, to: status }],
      });
    }
    const people = await this.namesFor(before, fields);
    const changes = diffFields(
      auditView(before as unknown as Record<string, unknown>, people),
      auditView(fields, people),
      AUDITED_FIELD_NAMES,
    );
    if (changes.length > 0) {
      await this.record(actor, {
        entityId: before._id,
        action: 'updated',
        summary: updateAuditSummary(changes.map((change) => change.field)),
        changes,
      });
    }
  }

  /** Names for everyone a change moves on or off the project, so the log reads in names. */
  private async namesFor(
    before: StoredProject,
    fields: Record<string, unknown>,
  ): Promise<PeopleMap> {
    const touchesPeople = fields.leadId !== undefined || fields.memberIds !== undefined;
    if (!touchesPeople) return new Map();
    return this.people.summaries([
      ...peopleIn(before as unknown as Record<string, unknown>),
      ...peopleIn(fields),
    ]);
  }

  private record(
    actor: ProjectActor,
    { entityId, action, summary, changes }: ProjectAuditEntry,
  ): Promise<void> {
    return this.audit.record({
      module: 'projects',
      entityType: 'project',
      entityId,
      action,
      actorId: actor.id,
      actorEmail: actor.email,
      summary,
      ...(changes ? { changes } : {}),
    });
  }
}
