import type { Article } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useArticle } from '../lib/content-hooks';
import { theme } from '../theme/theme';

import NewsArticle from './NewsArticle';

vi.mock('../lib/content-hooks', () => ({
  useArticle: vi.fn(),
}));

const article: Article = {
  id: 'article-1',
  title: 'How mentorship opens doors',
  slug: 'how-mentorship-opens-doors',
  excerpt: 'A story about guidance, confidence, and career growth.',
  body: '<p>Amara began with a question.</p><p>Mentorship helped her build <strong>confidence</strong>.</p>',
  tags: ['stories', 'mentorship'],
  status: 'published',
  publishedAt: '2026-06-08T12:00:00.000Z',
  createdAt: '2026-06-07T12:00:00.000Z',
  updatedAt: '2026-06-08T12:00:00.000Z',
};

const renderPage = (): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/news/${article.slug}`]}>
        <Routes>
          <Route path="/news/:slug" element={<NewsArticle />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('NewsArticle', () => {
  beforeEach(() => {
    vi.mocked(useArticle).mockReturnValue({
      data: article,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useArticle>);
  });

  it('renders the editorial article experience from CMS content', () => {
    renderPage();

    expect(useArticle).toHaveBeenCalledWith(article.slug);
    expect(screen.getByRole('heading', { name: article.title })).toBeInTheDocument();
    expect(screen.getByText('Amara began with a question.')).toBeInTheDocument();
    expect(screen.getByText('confidence')).toBeInTheDocument();
    expect(screen.getAllByText('Stories')).toHaveLength(2);
    expect(screen.getByText('Mentorship')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Share on LinkedIn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All news & stories' })).toHaveAttribute(
      'href',
      '/news',
    );
  });
});
