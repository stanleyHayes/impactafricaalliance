import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import { TOKENS } from '../../tokens.js';

import { LinkedInGateway } from './linkedin.gateway.js';
import { MetaGateway } from './meta.gateway.js';
import type { ArticleForSocial, SocialArticle, SocialGateway } from './types.js';
import { XGateway } from './x.gateway.js';

interface SocialPostRecord {
  platform: 'linkedin' | 'facebook' | 'instagram' | 'x';
  postId?: string;
  postUrl?: string;
  postedAt: Date;
  error?: string;
}

export interface DirectPostInput {
  message: string;
  linkUrl?: string;
  imageUrl?: string;
  platforms?: Array<'linkedin' | 'facebook' | 'instagram' | 'x'>;
}

const POST_PLATFORM_TO_GATEWAY: Record<'linkedin' | 'facebook' | 'instagram' | 'x', string> = {
  linkedin: 'linkedin',
  facebook: 'meta',
  instagram: 'meta',
  x: 'x',
};

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

  async publish(article: ArticleForSocial): Promise<SocialPostRecord[]> {
    const enabled = await this.enabledGateways();
    return this.publishToGateways(enabled, this.toSocialArticle(article));
  }

  async publishPost(input: DirectPostInput): Promise<SocialPostRecord[]> {
    const enabled = await this.enabledGateways();
    const allowedGatewayNames = input.platforms
      ? new Set(input.platforms.map((platform) => POST_PLATFORM_TO_GATEWAY[platform]))
      : null;
    const gateways = allowedGatewayNames
      ? enabled.filter((gateway) => allowedGatewayNames.has(gateway.name))
      : enabled;

    const socialArticle: SocialArticle = {
      title: input.message,
      excerpt: '',
      slug: '',
      coverImageUrl: input.imageUrl || undefined,
      url: input.linkUrl ?? '',
    };

    return this.publishToGateways(gateways, socialArticle);
  }

  private async enabledGateways(): Promise<SocialGateway[]> {
    const enabledResults = await Promise.all(
      this.gateways.map(async (gateway) => ({ gateway, enabled: await gateway.isEnabled() })),
    );
    return enabledResults.filter((item) => item.enabled).map((item) => item.gateway);
  }

  private async publishToGateways(
    gateways: SocialGateway[],
    socialArticle: SocialArticle,
  ): Promise<SocialPostRecord[]> {
    if (gateways.length === 0) {
      return [];
    }

    const records: SocialPostRecord[] = [];

    for (const gateway of gateways) {
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

  private toSocialArticle(article: ArticleForSocial): SocialArticle {
    return {
      title: article.title,
      excerpt: article.excerpt,
      slug: article.slug,
      coverImageUrl: article.coverImage?.url,
      url: `${this.config.siteUrl}/news/${article.slug}`,
    };
  }
}
