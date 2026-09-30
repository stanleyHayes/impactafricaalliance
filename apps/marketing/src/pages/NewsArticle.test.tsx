import type { Article, SiteImage } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useArticle, useSiteImages } from '../lib/content-hooks';
import { findBackground } from '../test/test-utils';
import { theme } from '../theme/theme';

import NewsArticle from './NewsArticle';

vi.mock('../lib/content-hooks', () => ({
  useArticle: vi.fn(),
  useHeroImage: vi.fn((_pageKey: string, fallback: string) => fallback),
  useSiteImages: vi.fn(() => ({ data: undefined })),
}));

const article: Article = {
  id: 'article-1',
  title: 'How mentorship opens doors',
  slug: 'how-mentorship-opens-doors',
  excerpt: 'A story about guidance, confidence, and career growth.',
  body: '<p>Amara began with a question.</p><p>Mentorship helped her build <strong>confidence</strong>.</p>',
  tags: ['stories', 'mentorship'],
  status: 'published',
  autoPostToSocial: false,
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

  describe('banner', () => {
    const UPLOAD = 'https://res.cloudinary.com/demo/image/upload/v1/site/banner.jpg';
    const upload = (key: string): SiteImage => ({
      id: key,
      key,
      image: { url: UPLOAD, publicId: 'site/banner' },
      isActive: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    });
    const serve = (items: SiteImage[]): void => {
      vi.mocked(useSiteImages).mockReturnValue({ data: { items } } as ReturnType<
        typeof useSiteImages
      >);
    };
    const sized = 'f_auto,q_auto,c_limit,w_1920/v1/site/banner.jpg';

    it('shows the shipped banner for an article without a cover and an empty dashboard', () => {
      serve([]);
      const { container } = renderPage();
      expect(findBackground(container, '/images/community.webp')).toBeDefined();
    });

    it('shows the dashboard’s article banner, or the default banner it shares', () => {
      for (const key of ['news-article-fallback', 'community']) {
        serve([upload(key)]);
        const { container, unmount } = renderPage();
        expect(findBackground(container, sized), key).toBeDefined();
        unmount();
      }
    });

    it('always shows an article’s own cover', () => {
      serve([upload('news-article-fallback')]);
      vi.mocked(useArticle).mockReturnValue({
        data: { ...article, coverImage: { url: 'https://example.org/cover.jpg', publicId: 'c' } },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useArticle>);
      const { container } = renderPage();
      expect(findBackground(container, 'https://example.org/cover.jpg')).toBeDefined();
      expect(findBackground(container, sized)).toBeUndefined();
    });
  });
});
