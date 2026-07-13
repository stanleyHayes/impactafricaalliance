import type { ArticleDocument } from '../../modules/content/models/article.model.js';

export interface SocialArticle {
  title: string;
  excerpt: string;
  slug: string;
  coverImageUrl?: string;
  url: string;
}

export interface SocialPostResult {
  platform: 'linkedin' | 'facebook' | 'instagram' | 'x';
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface SocialGateway {
  readonly name: string;
  isEnabled(): Promise<boolean>;
  publish(article: SocialArticle): Promise<SocialPostResult | SocialPostResult[]>;
}

export type ArticleForSocial = Pick<
  ArticleDocument,
  'title' | 'slug' | 'excerpt' | 'coverImage'
>;
