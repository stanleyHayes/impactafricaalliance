import type { Article } from '@iaa/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../test/test-utils';

import { ArticleCard } from './cards';

const article: Article = {
  id: 'article-1',
  title: 'Building digital opportunity across West Africa',
  slug: 'building-digital-opportunity',
  excerpt: 'A closer look at the people and partnerships expanding access to practical skills.',
  body: '<p>Young people are learning practical skills that connect directly to opportunity.</p>',
  coverImage: {
    url: 'https://example.com/article.jpg',
    publicId: 'articles/digital-opportunity',
    alt: 'Young people collaborating',
  },
  tags: ['digital-skills', 'programmes'],
  status: 'published',
  publishedAt: '2026-06-10T12:00:00.000Z',
  createdAt: '2026-06-09T12:00:00.000Z',
  updatedAt: '2026-06-10T12:00:00.000Z',
};

describe('ArticleCard', () => {
  it('presents editorial metadata and links to the article', () => {
    renderWithProviders(<ArticleCard article={article} featured />);

    expect(screen.getByRole('link', { name: `Read ${article.title}` })).toHaveAttribute(
      'href',
      `/news/${article.slug}`,
    );
    expect(screen.getByText('Featured story')).toBeInTheDocument();
    expect(screen.getByText('Digital Skills')).toBeInTheDocument();
    expect(screen.getByText('10 Jun 2026')).toBeInTheDocument();
    expect(screen.getByText('1 min read')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Young people collaborating' })).toBeInTheDocument();
  });
});
