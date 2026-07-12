import type { AnyKeys, HydratedDocument, UpdateQuery } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import type { ContentRepository } from '../../common/crud/content-repository.js';
import { ContentService, type ContentServiceOptions } from '../../common/crud/content-service.js';
import { SocialPublisher } from '../../providers/social/social-publisher.js';

import type { ArticleDocument } from './models/article.model.js';

@injectable()
export class ArticlePublishingService extends ContentService<ArticleDocument> {
  constructor(
    repo: ContentRepository<ArticleDocument>,
    options: ContentServiceOptions<ArticleDocument>,
    @inject(SocialPublisher) private readonly socialPublisher: SocialPublisher,
  ) {
    super(repo, options);
  }

  override async create(data: AnyKeys<ArticleDocument>): Promise<HydratedDocument<ArticleDocument>> {
    const article = await super.create(data);
    if (article.status === 'published' && article.autoPostToSocial) {
      await this.postToSocial(article);
    }
    return article;
  }

  override async update(
    id: string,
    changes: UpdateQuery<ArticleDocument>,
  ): Promise<HydratedDocument<ArticleDocument>> {
    const previous = await this.getById(id);
    const wasPublished = previous.status === 'published';
    const article = await super.update(id, changes);
    const becamePublished = article.status === 'published' && !wasPublished;

    if (becamePublished && article.autoPostToSocial) {
      await this.postToSocial(article);
    }
    return article;
  }

  private async postToSocial(article: HydratedDocument<ArticleDocument>): Promise<void> {
    if (article.socialPosts && article.socialPosts.length > 0) {
      return; // already posted; avoid duplicates on later edits
    }

    const posts = await this.socialPublisher.publish(article);
    if (posts.length > 0) {
      article.socialPosts.push(...posts);
      await article.save();
    }
  }
}
