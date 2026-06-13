import { ThemeProvider } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RESOURCES } from '../../resources/registry';
import type { ResourceConfig, ResourceRow } from '../../resources/types';
import { theme } from '../../theme/theme';

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

    render(
      <ThemeProvider theme={theme}>
        <ResourceDetailDialog
          resource={articleResource}
          open
          row={article}
          onClose={onClose}
          onEdit={onEdit}
          canEdit
        />
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

    fireEvent.click(screen.getByRole('button', { name: 'Edit article' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close article details' }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
