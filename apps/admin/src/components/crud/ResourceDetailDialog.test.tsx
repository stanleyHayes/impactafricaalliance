import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RESOURCES } from '../../resources/registry';
import type { ResourceConfig, ResourceRow } from '../../resources/types';
import { theme } from '../../theme/theme';

// The article dialog now lists this article's social publications, which asks
// who is viewing so it knows whether to offer Approve.
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: 'admin' } }) }));

import { ResourceDetailDialog } from './ResourceDetailDialog';

const articleResource = RESOURCES.find((resource) => resource.key === 'articles') as ResourceConfig;

const article: ResourceRow = {
  id: 'article-1',
  title: 'Skills that travel beyond the classroom',
  slug: 'skills-beyond-the-classroom',
  excerpt: 'A practical learning story from the Alliance network.',
  body: '## Learning by building\n\nYoung people created working prototypes in one afternoon.',
  status: 'published',
  tags: ['digital-skills', 'youth'],
  publishedAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-02T12:00:00.000Z',
};

describe('ResourceDetailDialog', () => {
  it('uses the editorial article detail experience and exposes its actions', () => {
    const onClose = vi.fn();
    const onEdit = vi.fn();

    // The dialog now shows this article's social publications, which is a
    // live query, so it needs a client the way the app gives it one.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <ResourceDetailDialog
            resource={articleResource}
            open
            row={article}
            onClose={onClose}
            onEdit={onEdit}
            canEdit
          />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Skills that travel beyond the classroom' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Article preview')).toBeInTheDocument();
    expect(screen.getByText('Publishing details')).toBeInTheDocument();
    expect(screen.getByText('Digital Skills')).toBeInTheDocument();
    expect(screen.getByText('/news/skills-beyond-the-classroom')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Learning by building' })).toBeInTheDocument();

    // Sharing is now offered alongside editing.
    expect(screen.getByRole('button', { name: 'Share to social' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit article' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close article details' }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
