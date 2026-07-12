import axios from 'axios';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';

import type { SocialArticle, SocialGateway, SocialPostResult } from './types.js';

@injectable()
export class MetaGateway implements SocialGateway {
  readonly name = 'meta';

  private readonly graphVersion = 'v20.0';

  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.config.social.metaPageAccessToken && this.config.social.metaPageId);
  }

  async publish(article: SocialArticle): Promise<SocialPostResult[]> {
    const results: SocialPostResult[] = [];
    const pageToken = this.config.social.metaPageAccessToken;
    const pageId = this.config.social.metaPageId;
    const instagramAccountId = this.config.social.metaInstagramBusinessAccountId;

    if (!pageToken || !pageId) {
      return [{ platform: 'facebook', error: 'Meta page credentials not configured' }];
    }

    // Facebook page feed post
    try {
      const fbResponse = await axios.post(
        `https://graph.facebook.com/${this.graphVersion}/${pageId}/feed`,
        {
          message: `${article.title}\n\n${article.excerpt}`,
          link: article.url,
          access_token: pageToken,
        },
      );
      results.push({
        platform: 'facebook',
        postId: fbResponse.data.id as string | undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Facebook publish failed';
      this.logger.error({ err }, 'Facebook publish failed');
      results.push({ platform: 'facebook', error: message });
    }

    // Instagram Business account post (requires a public image URL)
    if (instagramAccountId && article.coverImageUrl) {
      try {
        const containerResponse = await axios.post(
          `https://graph.facebook.com/${this.graphVersion}/${instagramAccountId}/media`,
          {
            image_url: article.coverImageUrl,
            caption: `${article.title}\n\n${article.excerpt}\n\n${article.url}`,
            access_token: pageToken,
          },
        );

        const creationId = containerResponse.data.id as string | undefined;
        if (creationId) {
          await axios.post(
            `https://graph.facebook.com/${this.graphVersion}/${instagramAccountId}/media_publish`,
            {
              creation_id: creationId,
              access_token: pageToken,
            },
          );
          results.push({ platform: 'instagram', postId: creationId });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Instagram publish failed';
        this.logger.error({ err }, 'Instagram publish failed');
        results.push({ platform: 'instagram', error: message });
      }
    }

    return results;
  }
}
