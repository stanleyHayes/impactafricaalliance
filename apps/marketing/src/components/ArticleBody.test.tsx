import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../test/test-utils';

import { ArticleBody, normalizeArticleBody } from './ArticleBody';

describe('ArticleBody', () => {
  it('normalizes legacy HTML without exposing raw markup', () => {
    const normalized = normalizeArticleBody(
      '<h2>What changed</h2><p>Training created <strong>new opportunities</strong>.</p>',
    );

    expect(normalized).toBe('## What changed\n\nTraining created **new opportunities**.');
  });

  it('renders legacy HTML and Markdown as editorial content', () => {
    renderWithProviders(
      <ArticleBody body="<p>Opening paragraph.</p><blockquote><p>A field insight.</p></blockquote>" />,
    );

    expect(screen.getByText('Opening paragraph.')).toBeInTheDocument();
    expect(screen.getByText('A field insight.')).toBeInTheDocument();
  });
});
