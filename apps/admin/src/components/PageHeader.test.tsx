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

  // A skin change in the console makes a new class for the panel (its radius
  // changes) but reuses the watermark's (its colour does not), so the panel's
  // rules land in a later stylesheet. A rule lifting every child would then
  // win over the watermark's own `position: absolute` and pull it into the
  // row, pushing the title to the far side. Sunset dark is used nowhere else
  // in this file, so both classes are new here whatever ran before.
  it('keeps the watermark out of the row after a skin change', () => {
    const header = (skin: SkinKey): JSX.Element => (
      <ThemeProvider theme={createAppTheme('sunset', 'dark', skin)}>
        <PageHeader title="Partner enquiries" icon={<FolderOutlinedIcon />} />
      </ThemeProvider>
    );
    const { container, rerender } = render(header('classic'));
    const panel = (): HTMLElement => container.firstElementChild as HTMLElement;
    const watermark = (): HTMLElement => panel().firstElementChild as HTMLElement;
    const before = { panel: panel().className, watermark: watermark().className };

    rerender(header('claymorphism'));

    // The conditions above: a new panel class, the same watermark class.
    expect(panel().className).not.toBe(before.panel);
    expect(watermark().className).toBe(before.watermark);
    expect(watermark()).toHaveAttribute('aria-hidden', 'true');
    expect(getComputedStyle(watermark()).position).toBe('absolute');
    // The title column is still lifted above the watermark.
    const column = panel().children[1] as HTMLElement;
    expect(getComputedStyle(column).position).toBe('relative');
    expect(getComputedStyle(column).zIndex).toBe('1');
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
