import {
  articleInputSchema,
  articleUpdateSchema,
  eventInputSchema,
  eventUpdateSchema,
  galleryItemInputSchema,
  galleryItemUpdateSchema,
  impactStatInputSchema,
  impactStatUpdateSchema,
  jobInputSchema,
  jobUpdateSchema,
  pageSettingInputSchema,
  pageSettingUpdateSchema,
  partnerInputSchema,
  partnerUpdateSchema,
  reportInputSchema,
  reportUpdateSchema,
  storyInputSchema,
  storyUpdateSchema,
  teamMemberInputSchema,
  teamMemberUpdateSchema,
} from '@iaa/shared';
import type { DependencyContainer } from 'tsyringe';

import { mountContentModule, type MountedContentModule } from '../../common/crud/content-module.js';
import { SocialPublisher } from '../../providers/social/social-publisher.js';

import { ArticlePublishingService } from './article-publishing.service.js';
import { ArticleModel } from './models/article.model.js';
import { EventModel } from './models/event.model.js';
import { GalleryItemModel } from './models/gallery.model.js';
import { JobModel } from './models/job.model.js';
import { PageSettingModel } from './models/page-setting.model.js';
import { PartnerModel } from './models/partner.model.js';
import { ReportModel } from './models/report.model.js';
import { ImpactStatModel } from './models/stat.model.js';
import { StoryModel } from './models/story.model.js';
import { TeamMemberModel } from './models/team.model.js';

const ACTIVE_ONLY = { isActive: true };

/** Instantiate the generic CRUD engine for every content resource. */
export const buildContentModules = (container: DependencyContainer): MountedContentModule[] => [
  mountContentModule(
    {
      path: 'articles',
      resource: 'Article',
      model: ArticleModel,
      schemas: { create: articleInputSchema, update: articleUpdateSchema },
      slugField: 'slug',
      defaultSort: { publishedAt: -1, createdAt: -1 },
      serviceFactory: (repo, options) =>
        new ArticlePublishingService(repo, options, container.resolve(SocialPublisher)),
    },
    container,
  ),
  mountContentModule(
    {
      path: 'stories',
      resource: 'Story',
      model: StoryModel,
      schemas: { create: storyInputSchema, update: storyUpdateSchema },
      slugField: 'slug',
      defaultSort: { order: 1, createdAt: -1 },
    },
    container,
  ),
  mountContentModule(
    {
      path: 'team',
      resource: 'Team member',
      model: TeamMemberModel,
      schemas: { create: teamMemberInputSchema, update: teamMemberUpdateSchema },
      publicFilter: ACTIVE_ONLY,
      defaultSort: { order: 1, name: 1 },
    },
    container,
  ),
  mountContentModule(
    {
      path: 'partners',
      resource: 'Partner',
      model: PartnerModel,
      schemas: { create: partnerInputSchema, update: partnerUpdateSchema },
      publicFilter: ACTIVE_ONLY,
      defaultSort: { order: 1, name: 1 },
    },
    container,
  ),
  mountContentModule(
    {
      path: 'reports',
      resource: 'Report',
      model: ReportModel,
      schemas: { create: reportInputSchema, update: reportUpdateSchema },
      defaultSort: { year: -1, order: 1 },
    },
    container,
  ),
  mountContentModule(
    {
      path: 'jobs',
      resource: 'Job',
      model: JobModel,
      schemas: { create: jobInputSchema, update: jobUpdateSchema },
      slugField: 'slug',
      defaultSort: { createdAt: -1 },
    },
    container,
  ),
  mountContentModule(
    {
      path: 'events',
      resource: 'Event',
      model: EventModel,
      schemas: { create: eventInputSchema, update: eventUpdateSchema },
      defaultSort: { startAt: -1 },
    },
    container,
  ),
  mountContentModule(
    {
      path: 'gallery',
      resource: 'Gallery item',
      model: GalleryItemModel,
      schemas: { create: galleryItemInputSchema, update: galleryItemUpdateSchema },
      defaultSort: { order: 1, capturedOn: -1, createdAt: -1 },
    },
    container,
  ),
  mountContentModule(
    {
      path: 'stats',
      resource: 'Impact stat',
      model: ImpactStatModel,
      schemas: { create: impactStatInputSchema, update: impactStatUpdateSchema },
      slugField: 'key',
      publicFilter: ACTIVE_ONLY,
      defaultSort: { order: 1 },
    },
    container,
  ),
  mountContentModule(
    {
      path: 'page-settings',
      resource: 'Page setting',
      model: PageSettingModel,
      schemas: { create: pageSettingInputSchema, update: pageSettingUpdateSchema },
      slugField: 'pageKey',
      defaultSort: { pageKey: 1 },
    },
    container,
  ),
];
