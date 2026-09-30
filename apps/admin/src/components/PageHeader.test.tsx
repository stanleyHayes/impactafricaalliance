import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SkinKey } from '../theme/skins';
import { createAppTheme } from '../theme/theme';

import { PageHeader } from './PageHeader';

/** Every CSS rule emotion has written so far (it writes text nodes outside production). */
const styles = (): string =>
  Array.from(document.querySelectorAll('style'))
    .map((tag) => tag.textContent ?? '')
    .join('\n');

const renderHeader = (skin: SkinKey) =>
  render(
    <ThemeProvider theme={createAppTheme('iaa', 'light', skin)}>
      <CssBaseline />
      <PageHeader
        title="Projects"
        description="Everything in flight."
        icon={<FolderOutlinedIcon />}
        count={3}
      />
    </ThemeProvider>,
  );

describe('PageHeader on the skin tokens', () => {
  it.each(['classic', 'neumorphism', 'glassmorphism', 'claymorphism'] as const)(
    'renders its title, count and description in %s',
    (skin) => {
      renderHeader(skin);
      expect(screen.getByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Everything in flight.')).toBeInTheDocument();
    },
  );

  it('paints the panel and icon square from the hero and tile tokens', () => {
    renderHeader('classic');
    const css = styles();
    for (const token of [
      'hero-bg',
      'hero-border',
      'hero-border-bottom',
      'hero-shadow',
      'tile-bg',
      'tile-border',
    ]) {
      expect(css).toContain(`var(--iaa-${token})`);
    }
  });

  it('resolves to its old Classic look through the tokens on :root', () => {
    renderHeader('classic');
    const css = styles();
    expect(css).toContain('--iaa-hero-bg:rgba(0, 214, 139, 0.075)');
    expect(css).toContain('--iaa-hero-border:1px solid rgba(0, 214, 139, 0.14)');
    expect(css).toContain('--iaa-hero-border-bottom:1px solid rgba(0, 214, 139, 0.11)');
    expect(css).toContain('--iaa-tile-bg:rgba(0, 214, 139, 0.1)');
    expect(css).toContain('--iaa-hero-shadow:none');
  });

  it('takes a skin’s own panel in another skin', () => {
    renderHeader('neumorphism');
    const tokens = createAppTheme('iaa', 'light', 'neumorphism').skinTokens;
    // The CSS writer drops spaces after commas in shadow lists; compare without spaces.
    const squash = (css: string): string => css.replace(/\s+/g, '');
    expect(squash(styles())).toContain(squash(`--iaa-hero-shadow:${tokens?.heroShadow}`));
    expect(tokens?.heroShadow).not.toBe('none');
  });
});
