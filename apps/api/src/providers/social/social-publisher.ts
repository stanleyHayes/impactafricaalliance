import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

import { LinkedInGateway } from './linkedin.gateway.js';
import { MetaGateway } from './meta.gateway.js';
import type { ArticleForSocial, SocialGateway } from './types.js';
import { XGateway } from './x.gateway.js';

@injectable()
export class SocialPublisher {
  private readonly gateways: SocialGateway[];

  constructor(
    @inject(LinkedInGateway) linkedIn: LinkedInGateway,
    @inject(MetaGateway) meta: MetaGateway,
    @inject(XGateway) x: XGateway,
    @inject(TOKENS.Config) private readonly config: AppConfig,
  ) {
    this.gateways = [linkedIn, meta, x];
  }

  async publish(article: ArticleForSocial): Promise<
    Array<{
      platform: 'linkedin' | 'facebook' | 'instagram' | 'x';
      postId?: string;
      postUrl?: string;
      postedAt: Date;
      error?: string;
    }>
  > {
    const enabledResults = await Promise.all(
      this.gateways.map(async (gateway) => ({ gateway, enabled: await gateway.isEnabled() })),
    );
    const enabled = enabledResults.filter((item) => item.enabled).map((item) => item.gateway);

    if (enabled.length === 0) {
      return [];
    }

    const socialArticle = this.toSocialArticle(article);
    const records: Array<{
      platform: 'linkedin' | 'facebook' | 'instagram' | 'x';
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
        records.push({
          platform: gateway.name === 'meta' ? 'facebook' : (gateway.name as 'linkedin' | 'x'),
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
