import {
  IMPACT_STORY_VIEW_STATUSES,
  impactStoryInputSchema,
  isReservedStorySlug,
  storyBlockSchema,
  storyFromProject,
  type ImpactStory,
  type ImpactStoryInput,
  type ImpactStoryListItem,
  type ImpactStoryListQuery,
  type ImpactStoryStatus,
  type ImpactStoryUpdate,
  type Paginated,
  type PersonSummary,
  type PreviewLink,
  type ProjectRef,
  type PublicImpactStory,
  type PublicImpactStoryListItem,
  type PublicImpactStoryQuery,
  type StoryBlock,
  type StoryPublishCandidate,
  type AuditAction,
  type AuditChange,
} from '@iaa/shared';
import { MongoServerError } from 'mongodb';
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
import { createPreviewLink, verifyPreviewToken } from '../../common/preview-token.js';
import { escapeRegex, searchRegex } from '../../common/regex.js';
import { parseWith } from '../../common/validate.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';
import { diffFields } from '../audit/audit-diff.js';
import { AuditService } from '../audit/audit.service.js';
import { PeopleService } from '../people/people.service.js';
import { ProjectModel } from '../projects/project.model.js';

import {
  ImpactStoryModel,
  type ImpactStoryDocument,
  type ImpactStorySeoRecord,
} from './impact-story.model.js';
import {
  assertPublishable,
  assertStoryMove,
  firstFreeSlug,
  projectStorySource,
  statusAuditEntry,
  type StoredProject,
} from './impact-story.rules.js';

/** Who is making a change, always from the verified access token (plan D16). */
export interface StoryActor {
  id: string;
  email: string;
  isAdmin: boolean;
}

type StoredStory = ImpactStoryDocument & { _id: Types.ObjectId };

const MODULE = 'impact-stories';
const ENTITY = 'impact-story';

// Stricter than `Types.ObjectId.isValid`, which also accepts any 12-character string.
const OBJECT_ID = /^[a-f\d]{24}$/i;
const DUPLICATE_KEY_CODE = 11000;
// Attempts at a free slug when two drafts are started from one project at once.
const SLUG_ATTEMPTS = 3;

const SLUG_TAKEN = 'Another story already uses this web address (slug). Choose a different one.';
const CHANGED_MEANWHILE = 'Someone else changed this story just now. Reload it and try again.';

// Fields compared for the activity log. Blocks are named, not diffed: a
// story's body in the log would be a second copy of the story.
const AUDITED_FIELDS = [
  'title',
  'slug',
  'excerpt',
  'cover',
  'projectId',
  'tags',
  'country',
  'programme',
  'seo',
] as const;

// Replaced as given on PATCH.
const PLAIN_FIELDS = ['title', 'slug', 'excerpt', 'blocks', 'tags'] as const;
// Null (or an emptied input) removes the value rather than storing null.
const CLEARABLE_FIELDS = ['cover', 'country', 'programme', 'seo'] as const;

const actorObjectId = (actor: StoryActor): Types.ObjectId | undefined =>
  OBJECT_ID.test(actor.id) ? new Types.ObjectId(actor.id) : undefined;

const iso = (value?: Date | null): string | null => (value ? value.toISOString() : null);

const blockCount = (count: number): string => `${count} ${count === 1 ? 'block' : 'blocks'}`;

const isDuplicateKey = (error: unknown): boolean =>
  error instanceof MongoServerError && error.code === DUPLICATE_KEY_CODE;

/** Exact match ignoring case, for the free-text filters on the public list. */
const exactText = (value: string): RegExp => new RegExp(`^${escapeRegex(value.trim())}$`, 'i');

const publicSeo = (seo?: ImpactStorySeoRecord | null): PublicImpactStory['seo'] => {
  if (!seo) {
    return undefined;
  }
  const result: NonNullable<PublicImpactStory['seo']> = {};
  if (seo.title) result.title = seo.title;
  if (seo.description) result.description = seo.description;
  if (seo.image) result.image = seo.image;
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * A story as the public site receives it. Built field by field rather than by
 * deleting from the stored record, so nothing added to the model later can
 * reach the public by accident: no project link, no staff names, no status
 * (plan D16).
 */
const toPublicStory = (story: StoredStory): PublicImpactStory => {
  const seo = publicSeo(story.seo);
  return {
    id: story._id.toString(),
    title: story.title,
    slug: story.slug,
    excerpt: story.excerpt,
    ...(story.cover ? { cover: story.cover } : {}),
    blocks: story.blocks as unknown as StoryBlock[],
    tags: story.tags ?? [],
    ...(story.country ? { country: story.country } : {}),
    ...(story.programme ? { programme: story.programme } : {}),
    ...(seo ? { seo } : {}),
    // A preview of a story never published has no date of its own yet.
    publishedAt: (story.publishedAt ?? story.updatedAt).toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
};

const toPublicListItem = (story: StoredStory): PublicImpactStoryListItem => ({
  id: story._id.toString(),
  title: story.title,
  slug: story.slug,
  excerpt: story.excerpt,
  ...(story.cover ? { cover: story.cover } : {}),
  tags: story.tags ?? [],
  ...(story.country ? { country: story.country } : {}),
  ...(story.programme ? { programme: story.programme } : {}),
  publishedAt: (story.publishedAt ?? story.updatedAt).toISOString(),
  updatedAt: story.updatedAt.toISOString(),
});

interface StoryContext {
  projects: ReadonlyMap<string, ProjectRef>;
  people: ReadonlyMap<string, PersonSummary>;
}

const personFor = (context: StoryContext, id?: Types.ObjectId | null): PersonSummary | null =>
  id ? (context.people.get(id.toString()) ?? null) : null;

const projectFor = (context: StoryContext, id?: Types.ObjectId | null): ProjectRef | null =>
  id ? (context.projects.get(id.toString()) ?? null) : null;

const toListItem = (story: StoredStory, context: StoryContext): ImpactStoryListItem => ({
  id: story._id.toString(),
  title: story.title,
  slug: story.slug,
  excerpt: story.excerpt,
  cover: story.cover ?? null,
  status: story.status,
  projectId: story.projectId?.toString() ?? null,
  project: projectFor(context, story.projectId),
  tags: story.tags ?? [],
  ...(story.country ? { country: story.country } : {}),
  programme: story.programme ?? null,
  publishedAt: iso(story.publishedAt),
  blockCount: story.blocks?.length ?? 0,
  updatedBy: personFor(context, story.updatedBy),
  createdAt: story.createdAt.toISOString(),
  updatedAt: story.updatedAt.toISOString(),
});

const toStory = (story: StoredStory, context: StoryContext): ImpactStory => ({
  id: story._id.toString(),
  title: story.title,
  slug: story.slug,
  excerpt: story.excerpt,
  cover: story.cover ?? null,
  projectId: story.projectId?.toString() ?? null,
  project: projectFor(context, story.projectId),
  status: story.status,
  blocks: story.blocks as unknown as StoryBlock[],
  tags: story.tags ?? [],
  ...(story.country ? { country: story.country } : {}),
  programme: story.programme ?? null,
  seo: story.seo ?? null,
  publishedAt: iso(story.publishedAt),
  schemaVersion: story.schemaVersion,
  createdBy: personFor(context, story.createdBy),
  updatedBy: personFor(context, story.updatedBy),
  createdAt: story.createdAt.toISOString(),
  updatedAt: story.updatedAt.toISOString(),
});

/** The `$set`/`$unset` for a PATCH, apart from the project link. */
const updateOperations = (
  patch: ImpactStoryUpdate,
): { set: Record<string, unknown>; unset: Record<string, 1> } => {
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  for (const key of PLAIN_FIELDS) {
    if (patch[key] !== undefined) {
      set[key] = patch[key];
    }
  }
  for (const key of CLEARABLE_FIELDS) {
    const value = patch[key];
    if (value === null) {
      unset[key] = 1;
    } else if (value !== undefined) {
      set[key] = value;
    }
  }
  return { set, unset };
};

/**
 * A validated input as a new stored story: nulls left out rather than stored,
 * the project link as an ObjectId, always a draft.
 */
const newStoryDocument = (
  input: ImpactStoryInput,
  actor: StoryActor,
): Partial<ImpactStoryDocument> => {
  const { cover, projectId, programme, ...rest } = input;
  return {
    ...rest,
    ...(cover ? { cover } : {}),
    ...(projectId ? { projectId: new Types.ObjectId(projectId) } : {}),
    ...(programme ? { programme } : {}),
    status: 'draft',
    createdBy: actorObjectId(actor),
    updatedBy: actorObjectId(actor),
  };
};

/** What a published story would look like after a PATCH, for the publish check. */
const afterPatch = (story: StoredStory, patch: ImpactStoryUpdate): StoryPublishCandidate => ({
  excerpt: patch.excerpt ?? story.excerpt,
  cover: patch.cover === undefined ? story.cover : patch.cover,
  blocks: patch.blocks ?? story.blocks,
});

interface AuditEntry {
  entityId: Types.ObjectId;
  action: AuditAction;
  summary: string;
  changes?: AuditChange[];
}

const listFilter = (query: ImpactStoryListQuery): QueryFilter<ImpactStoryDocument> => {
  const viewStatuses = IMPACT_STORY_VIEW_STATUSES[query.view];
  // A status narrows the view; one outside it matches nothing rather than
  // quietly widening the tab the reader is looking at.
  const statuses: readonly ImpactStoryStatus[] = query.status
    ? viewStatuses.filter((status) => status === query.status)
    : viewStatuses;
  const filter: QueryFilter<ImpactStoryDocument> = { status: { $in: statuses } };
  if (query.q) {
    const pattern = searchRegex(query.q);
    filter.$or = [{ title: pattern }, { excerpt: pattern }];
  }
  if (query.projectId) {
    filter.projectId = new Types.ObjectId(query.projectId);
  }
  if (query.programme) {
    filter.programme = query.programme;
  }
  return filter;
};

/**
 * Impact stories (plan §3.5, spec §9): edited, block-built accounts of what a
 * project achieved, written in the dashboard and published on the website.
 *
 * Every write records who made it and adds a line to the activity log. The
 * public methods only ever read published stories, except `previewByToken`,
 * which needs a signed, short-lived token issued to a signed-in editor.
 */
@injectable()
export class ImpactStoryService {
  constructor(
    @inject(AuditService) private readonly audit: AuditService,
    @inject(PeopleService) private readonly people: PeopleService,
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /** One page of the dashboard's list, most recently changed first. */
  async list(query: ImpactStoryListQuery): Promise<Paginated<ImpactStoryListItem>> {
    const filter = listFilter(query);
    const [stories, total] = await Promise.all([
      ImpactStoryModel.find(filter)
        .select('-blocks.data -seo')
        .sort({ updatedAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<StoredStory[]>()
        .exec(),
      ImpactStoryModel.countDocuments(filter).exec(),
    ]);
    const context = await this.contextFor(stories);
    return paginate(
      stories.map((story) => toListItem(story, context)),
      total,
      query.page,
      query.pageSize,
    );
  }

  /** One story, in any status, with its project and the people who wrote it. */
  async get(id: string): Promise<ImpactStory> {
    return this.present(await this.load(id));
  }

  async create(input: ImpactStoryInput, actor: StoryActor): Promise<ImpactStory> {
    await this.assertSlugUsable(input.slug);
    await this.assertProjectExists(input.projectId);
    const story = await ImpactStoryModel.create(newStoryDocument(input, actor));
    await this.record(actor, {
      entityId: story._id,
      action: 'created',
      summary: `Created “${story.title}”`,
    });
    return this.get(story._id.toString());
  }

  /**
   * A new draft copied from a project (spec §9.3): its words, numbers,
   * partners and the photos cleared for public use, never live references.
   * The story keeps the project's id so the two can be found together, and
   * nothing about the project later changes it.
   */
  async createFromProject(projectId: string, actor: StoryActor): Promise<ImpactStory> {
    const project = await ProjectModel.findById(projectId).lean<StoredProject>().exec();
    if (!project) {
      throw new NotFoundError('Project');
    }
    const draft = storyFromProject(projectStorySource(project));
    // A block the project cannot fill properly (an old photo stored without a
    // secure address, say) is left out rather than refusing the whole draft.
    const blocks = draft.blocks.filter((block) => storyBlockSchema.safeParse(block).success);
    if (blocks.length < draft.blocks.length) {
      this.logger.warn(
        { module: MODULE, entityId: projectId, dropped: draft.blocks.length - blocks.length },
        'Left out project content a story cannot hold',
      );
    }
    const input = parseWith(impactStoryInputSchema, { ...draft, blocks });
    const story = await this.createWithFreeSlug(input, actor);
    await this.record(actor, {
      entityId: story._id,
      action: 'created',
      summary: `Created from project ${project.title}`,
    });
    return this.get(story._id.toString());
  }

  async update(id: string, patch: ImpactStoryUpdate, actor: StoryActor): Promise<ImpactStory> {
    const story = await this.load(id);
    // A live story is public words in the organisation's name, so changing
    // one is publishing and stays with administrators (plan D2).
    if (story.status === 'published' && !actor.isAdmin) {
      throw new ForbiddenError(
        'This story is on the website. Ask an administrator to change it, or to unpublish it so you can edit the draft.',
      );
    }
    if (patch.slug && patch.slug !== story.slug) {
      await this.assertSlugUsable(patch.slug, story._id);
    }
    if (story.status === 'published') {
      assertPublishable(afterPatch(story, patch), 'A published story must stay ready to publish');
    }
    const { set, unset } = updateOperations(patch);
    if (patch.projectId === null) {
      unset.projectId = 1;
    } else if (patch.projectId) {
      await this.assertProjectExists(patch.projectId);
      set.projectId = new Types.ObjectId(patch.projectId);
    }
    set.updatedBy = actorObjectId(actor);
    const hasUnset = Object.keys(unset).length > 0;
    const updated = await ImpactStoryModel.findOneAndUpdate(
      // Conditional on the status the checks above were made against: if an
      // administrator publishes the story in the meantime, an editor's save
      // must not land on the live page.
      { _id: story._id, status: story.status },
      { $set: set, ...(hasUnset ? { $unset: unset } : {}) },
      { returnDocument: 'after', runValidators: true },
    )
      .lean<StoredStory>()
      .exec();
    if (!updated) {
      throw await this.goneOrChanged(story._id);
    }
    await this.recordUpdate(actor, story, patch);
    return this.present(updated);
  }

  /** Review, publish, unpublish, archive or restore (plan §3.5, D2). */
  async changeStatus(id: string, to: ImpactStoryStatus, actor: StoryActor): Promise<ImpactStory> {
    const story = await this.load(id);
    assertStoryMove(story, to, { isAdmin: actor.isAdmin });
    if (story.status === to) {
      return this.present(story);
    }
    const firstPublication = to === 'published' && !story.publishedAt;
    const updated = await ImpactStoryModel.findOneAndUpdate(
      // Conditional on the status just checked, so two people moving the same
      // story at once cannot both succeed from the same starting point.
      { _id: story._id, status: story.status },
      {
        $set: {
          status: to,
          updatedBy: actorObjectId(actor),
          ...(firstPublication ? { publishedAt: new Date() } : {}),
        },
      },
      { returnDocument: 'after' },
    )
      .lean<StoredStory>()
      .exec();
    if (!updated) {
      throw await this.goneOrChanged(story._id);
    }
    await this.record(actor, {
      entityId: story._id,
      ...statusAuditEntry(story.status, to, { firstPublication }),
      changes: [{ field: 'status', from: story.status, to }],
    });
    return this.present(updated);
  }

  /** A two-hour link to the story on the real public page (plan D10). */
  async previewLink(id: string): Promise<PreviewLink> {
    const story = await this.load(id);
    return createPreviewLink({ kind: 'impact-story', id: story._id.toString() }, this.config);
  }

  /**
   * Delete a draft that never went public. Once published, a story may have
   * been read, linked and indexed, so it is archived instead (plan D5).
   */
  async remove(id: string, actor: StoryActor): Promise<void> {
    const story = await this.load(id);
    if (story.publishedAt) {
      throw new ConflictError(
        'This story has been published, so it cannot be deleted. Archive it instead.',
      );
    }
    // Conditional as well: a story published since it was read above stays.
    const { deletedCount } = await ImpactStoryModel.deleteOne({
      _id: story._id,
      publishedAt: null,
    }).exec();
    if (deletedCount === 0) {
      throw await this.goneOrChanged(story._id);
    }
    await this.record(actor, {
      entityId: story._id,
      action: 'deleted',
      summary: `Deleted “${story.title}”`,
    });
  }

  /** Published stories for the website, newest first. */
  async publicList(query: PublicImpactStoryQuery): Promise<Paginated<PublicImpactStoryListItem>> {
    const filter: QueryFilter<ImpactStoryDocument> = { status: 'published' };
    if (query.programme) filter.programme = query.programme;
    if (query.country) filter.country = exactText(query.country);
    if (query.tag) filter.tags = exactText(query.tag);
    const [stories, total] = await Promise.all([
      ImpactStoryModel.find(filter)
        .select('title slug excerpt cover tags country programme publishedAt updatedAt')
        .sort({ publishedAt: -1, _id: -1 })
        .skip((query.page - 1) * query.pageSize)
        .limit(query.pageSize)
        .lean<StoredStory[]>()
        .exec(),
      ImpactStoryModel.countDocuments(filter).exec(),
    ]);
    return paginate(stories.map(toPublicListItem), total, query.page, query.pageSize);
  }

  /** A published story by its address. Anything else is simply not found. */
  async publicBySlug(slug: string): Promise<PublicImpactStory> {
    const story = await ImpactStoryModel.findOne({ slug, status: 'published' })
      .lean<StoredStory>()
      .exec();
    if (!story) {
      throw new NotFoundError('Impact story');
    }
    return toPublicStory(story);
  }

  /**
   * The story a preview token was issued for, in whatever status it is in.
   * A missing, expired, altered or wrong-kind token is the same 404 as a
   * deleted story, so the answer says nothing about which it was.
   */
  async previewByToken(token: string | undefined): Promise<PublicImpactStory> {
    const id = verifyPreviewToken(token, 'impact-story', this.config);
    const story = id ? await ImpactStoryModel.findById(id).lean<StoredStory>().exec() : null;
    if (!story) {
      throw new NotFoundError('Preview');
    }
    return toPublicStory(story);
  }

  private async load(id: string): Promise<StoredStory> {
    const story = await ImpactStoryModel.findById(id).lean<StoredStory>().exec();
    if (!story) {
      throw new NotFoundError('Impact story');
    }
    return story;
  }

  private async present(story: StoredStory): Promise<ImpactStory> {
    return toStory(story, await this.contextFor([story]));
  }

  /** Project titles and people's names for a set of stories, in two queries. */
  private async contextFor(stories: readonly StoredStory[]): Promise<StoryContext> {
    const projectIds = [
      ...new Set(stories.flatMap((story) => (story.projectId ? [story.projectId.toString()] : []))),
    ];
    const [projects, people] = await Promise.all([
      projectIds.length > 0
        ? ProjectModel.find({ _id: { $in: projectIds } })
            .select('title slug')
            .lean<{ _id: Types.ObjectId; title: string; slug: string }[]>()
            .exec()
        : Promise.resolve([]),
      this.people.summaries(stories.flatMap((story) => [story.createdBy, story.updatedBy])),
    ]);
    return {
      projects: new Map(
        projects.map((project) => [
          project._id.toString(),
          { id: project._id.toString(), title: project.title, slug: project.slug },
        ]),
      ),
      people,
    };
  }

  /**
   * Refuse an address the site already uses for something else (400, on the
   * slug field so the editor lands on it) or one another story holds (409).
   */
  private async assertSlugUsable(slug: string, except?: Types.ObjectId): Promise<void> {
    if (isReservedStorySlug(slug)) {
      throw new ValidationError('This web address is reserved', [
        {
          path: 'slug',
          message: `The website already uses /impact/stories/${slug}. Choose a different web address.`,
        },
      ]);
    }
    await this.assertSlugFree(slug, except);
  }

  /**
   * Why a conditional write matched nothing: the story is gone (404), or it
   * moved on since it was read (409).
   */
  private async goneOrChanged(id: Types.ObjectId): Promise<NotFoundError | ConflictError> {
    const exists = await ImpactStoryModel.exists({ _id: id }).exec();
    return exists ? new ConflictError(CHANGED_MEANWHILE) : new NotFoundError('Impact story');
  }

  private async assertSlugFree(slug: string, except?: Types.ObjectId): Promise<void> {
    const clash = await ImpactStoryModel.exists({
      slug,
      ...(except ? { _id: { $ne: except } } : {}),
    }).exec();
    if (clash) {
      throw new ConflictError(SLUG_TAKEN);
    }
  }

  /** Refuse a project link to a project that does not exist (plan D16). */
  private async assertProjectExists(id?: string | null): Promise<void> {
    if (!id) {
      return;
    }
    const exists = await ProjectModel.exists({ _id: id }).exec();
    if (!exists) {
      throw new ValidationError('The linked project does not exist', [
        { path: 'projectId', message: 'Choose a project that exists' },
      ]);
    }
  }

  private async createWithFreeSlug(
    input: ImpactStoryInput,
    actor: StoryActor,
  ): Promise<{ _id: Types.ObjectId }> {
    const pattern = new RegExp(`^${escapeRegex(input.slug)}(?:-\\d+)?$`);
    for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt += 1) {
      const taken = await ImpactStoryModel.find({ slug: pattern })
        .select('slug')
        .lean<{ slug: string }[]>()
        .exec();
      const slug = firstFreeSlug(input.slug, new Set(taken.map((story) => story.slug)));
      try {
        return await ImpactStoryModel.create(newStoryDocument({ ...input, slug }, actor));
      } catch (error) {
        // Someone took the same slug between the check and the insert.
        if (!isDuplicateKey(error) || attempt === SLUG_ATTEMPTS) {
          throw error;
        }
      }
    }
    throw new ConflictError(SLUG_TAKEN);
  }

  private async recordUpdate(
    actor: StoryActor,
    before: StoredStory,
    patch: ImpactStoryUpdate,
  ): Promise<void> {
    const changes = diffFields(before, patch, AUDITED_FIELDS);
    // The editor sends every block on every save, so only a real difference
    // is logged, and then as a count rather than a copy of the story.
    if (patch.blocks !== undefined && diffFields(before, patch, ['blocks']).length > 0) {
      changes.push({
        field: 'blocks',
        from: blockCount(before.blocks.length),
        to: blockCount(patch.blocks.length),
      });
    }
    const fields = changes.map((change) => change.field).join(', ');
    await this.record(actor, {
      entityId: before._id,
      action: 'updated',
      summary: fields ? `Edited ${fields}` : 'Saved without changes',
      changes,
    });
  }

  private async record(actor: StoryActor, entry: AuditEntry): Promise<void> {
    await this.audit.record({
      module: MODULE,
      entityType: ENTITY,
      actorId: actor.id,
      actorEmail: actor.email,
      ...entry,
    });
  }
}
