import axios from 'axios';
import { inject, injectable } from 'tsyringe';

import type { AppLogger } from '../../config/logger.js';
import { SocialOAuthService } from '../../modules/social/social-oauth.service.js';
import { TOKENS } from '../../tokens.js';

import type { SocialArticle, SocialGateway, SocialPostResult } from './types.js';

@injectable()
export class LinkedInGateway implements SocialGateway {
  readonly name = 'linkedin';

  constructor(
    @inject(SocialOAuthService) private readonly oauth: SocialOAuthService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async isEnabled(): Promise<boolean> {
    return (await this.oauth.getValidAccessToken('linkedin')) !== null;
  }

  async publish(article: SocialArticle): Promise<SocialPostResult> {
    const credentials = await this.oauth.getValidAccessToken('linkedin');
    if (!credentials) {
      return { platform: 'linkedin', error: 'LinkedIn account not connected' };
    }

    const { accessToken, account } = credentials;

    try {
      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: account.accountId,
          lifecycleState: 'PUBLISHED',
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: [article.title, article.excerpt].filter(Boolean).join('\n\n'),
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
            Authorization: `Bearer ${accessToken}`,
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
