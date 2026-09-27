import {
  IMPACT_STORY_SCHEMA_VERSION,
  IMPACT_STORY_STATUSES,
  STORY_BLOCK_TYPES,
  type ImpactStoryStatus,
  type MediaAsset,
  type StoryBlockType,
} from '@iaa/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { baseSchemaOptions, mediaSubSchema } from '../../common/model-helpers.js';
import { userRef } from '../../common/work-model-helpers.js';

/**
 * The impact story data contract (plan §2,
 * `packages/shared/src/schemas/impact-story.ts`).
 *
 * Named `ImpactStory` because `Story` is already the testimonial on the home
 * page. A story made from a project holds copies of the project's words and
 * photos, never live references, so editing one never changes the other.
 */

/**
 * One block of the story. `data` is checked against the block type's schema
 * in `@iaa/shared` before it is stored; the array order is the page order.
 */
export interface StoryBlockRecord {
  id: string;
  type: StoryBlockType;
  data: Record<string, unknown>;
}

export interface ImpactStorySeoRecord {
  title?: string;
  description?: string;
  image?: MediaAsset | null;
}

export interface ImpactStoryDocument {
  /** The project it tells the story of. Internal: never sent to the public site. */
  projectId?: Types.ObjectId | null;
  title: string;
  slug: string;
  excerpt: string;
  cover?: MediaAsset | null;
  status: ImpactStoryStatus;
  blocks: StoryBlockRecord[];
  tags: string[];
  country?: string;
  /** A `PILLARS` key; plain text for the reason given on `ProjectRecord.programme`. */
  programme?: string | null;
  seo?: ImpactStorySeoRecord | null;
  /** First publication; kept when a story is unpublished and published again. */
  publishedAt?: Date | null;
  /** The shape the blocks were written in, so a later change of shape can be migrated. */
  schemaVersion: number;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ImpactStoryHydrated = HydratedDocument<ImpactStoryDocument>;

const blockSubSchema = new Schema<StoryBlockRecord>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: STORY_BLOCK_TYPES, required: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const seoSubSchema = new Schema<ImpactStorySeoRecord>(
  {
    title: { type: String },
    description: { type: String },
    image: { type: mediaSubSchema },
  },
  { _id: false },
);

const impactStorySchema = new Schema<ImpactStoryDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    excerpt: { type: String, required: true, trim: true },
    cover: { type: mediaSubSchema },
    status: { type: String, enum: IMPACT_STORY_STATUSES, default: 'draft' },
    blocks: { type: [blockSubSchema], default: [] },
    tags: { type: [String], default: [] },
    country: { type: String, trim: true },
    programme: { type: String },
    seo: { type: seoSubSchema },
    publishedAt: { type: Date },
    schemaVersion: { type: Number, default: IMPACT_STORY_SCHEMA_VERSION },
    createdBy: userRef(),
    updatedBy: userRef(),
  },
  { ...baseSchemaOptions, collection: 'impactstories' },
);

// Stories are found by slug on the public site, and a clash on save is a 409.
impactStorySchema.index({ slug: 1 }, { unique: true });
// The public list (published, newest first) and the dashboard's status tabs.
impactStorySchema.index({ status: 1, publishedAt: -1 });
// A project's stories, and refusing to delete a project that has any.
impactStorySchema.index({ projectId: 1 });

export const ImpactStoryModel = model<ImpactStoryDocument>('ImpactStory', impactStorySchema);
