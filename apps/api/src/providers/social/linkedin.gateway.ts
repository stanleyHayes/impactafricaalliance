import axios from 'axios';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';

import type { SocialArticle, SocialGateway, SocialPostResult } from './types.js';

@injectable()
export class LinkedInGateway implements SocialGateway {
  readonly name = 'linkedin';

  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.config.social.linkedinAccessToken && this.config.social.linkedinOrganizationUrn);
  }

  async publish(article: SocialArticle): Promise<SocialPostResult> {
    const token = this.config.social.linkedinAccessToken;
    const author = this.config.social.linkedinOrganizationUrn;

    if (!token || !author) {
      return { platform: 'linkedin', error: 'LinkedIn credentials not configured' };
    }

    try {
      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author,
          lifecycleState: 'PUBLISHED',
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: `${article.title}\n\n${article.excerpt}`,
              },
              shareMediaCategory: article.coverImageUrl ? 'ARTICLE' : 'NONE',
              media: article.coverImageUrl
                ? [
                    {
                      status: 'READY',
                      originalUrl: article.url,
                      title: { text: article.title },
                      description: { text: article.excerpt },
                      thumbnails: [{ url: article.coverImageUrl }],
                    },
                  ]
                : undefined,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        platform: 'linkedin',
        postId: response.data.id as string | undefined,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'LinkedIn publish failed';
      this.logger.error({ err }, 'LinkedIn publish failed');
      return { platform: 'linkedin', error: message };
    }
  }
}
