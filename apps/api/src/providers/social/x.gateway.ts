import axios from 'axios';
import { inject, injectable } from 'tsyringe';

import type { AppLogger } from '../../config/logger.js';
import { SocialOAuthService } from '../../modules/social/social-oauth.service.js';
import { TOKENS } from '../../tokens.js';

import type { SocialArticle, SocialGateway, SocialPostResult } from './types.js';

@injectable()
export class XGateway implements SocialGateway {
  readonly name = 'x';

  constructor(
    @inject(SocialOAuthService) private readonly oauth: SocialOAuthService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async isEnabled(): Promise<boolean> {
    return (await this.oauth.getValidAccessToken('x')) !== null;
  }

  async publish(article: SocialArticle): Promise<SocialPostResult> {
    const credentials = await this.oauth.getValidAccessToken('x');
    if (!credentials) {
      return { platform: 'x', error: 'X account not connected' };
    }

    const { accessToken } = credentials;
    const text = [article.title, article.excerpt, article.url].filter(Boolean).join('\n\n');

    try {
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        { text },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const postId = response.data.data?.id as string | undefined;
      return {
        platform: 'x',
        postId,
        postUrl: postId ? `https://x.com/i/web/status/${postId}` : undefined,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'X publish failed';
      this.logger.error({ err }, 'X publish failed');
      return { platform: 'x', error: message };
    }
  }
}
