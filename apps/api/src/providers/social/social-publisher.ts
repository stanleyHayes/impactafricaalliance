import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';

import { LinkedInGateway } from './linkedin.gateway.js';
import { MetaGateway } from './meta.gateway.js';
import type { ArticleForSocial, SocialGateway } from './types.js';

@injectable()
export class SocialPublisher {
  private readonly gateways: SocialGateway[];

  constructor(
    @inject(LinkedInGateway) linkedIn: LinkedInGateway,
    @inject(MetaGateway) meta: MetaGateway,
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {
    this.gateways = [linkedIn, meta];
  }

  async publish(article: ArticleForSocial): Promise<
    Array<{
      platform: 'linkedin' | 'facebook' | 'instagram';
      postId?: string;
      postUrl?: string;
      postedAt: Date;
      error?: string;
    }>
  > {
    const enabled = this.gateways.filter((gateway) => gateway.isEnabled());
    if (enabled.length === 0) {
      this.logger.info('Social publishing skipped: no enabled gateways');
      return [];
    }

    const socialArticle = this.toSocialArticle(article);
    const records: Array<{
      platform: 'linkedin' | 'facebook' | 'instagram';
      postId?: string;
      postUrl?: string;
      postedAt: Date;
      error?: string;
    }> = [];

    for (const gateway of enabled) {
      try {
        const result = await gateway.publish(socialArticle);
        const items = Array.isArray(result) ? result : [result];
        for (const item of items) {
          records.push({ ...item, postedAt: new Date() });
        }
      } catch (err: unknown) {
        this.logger.error({ err, gateway: gateway.name }, 'Social gateway failed');
        records.push({
          platform: gateway.name === 'linkedin' ? 'linkedin' : 'facebook',
          postedAt: new Date(),
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return records;
  }

  private toSocialArticle(article: ArticleForSocial) {
    return {
      title: article.title,
      excerpt: article.excerpt,
      slug: article.slug,
      coverImageUrl: article.coverImage?.url,
      url: `${this.config.siteUrl}/news/${article.slug}`,
    };
  }
}
