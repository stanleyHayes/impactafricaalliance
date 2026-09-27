import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { createAppTheme, THEME_PRESETS } from './theme';

// WCAG AA for text under 18.66px bold, which every chip label and tab is.
const AA_TEXT = 4.5;

const EVERY_THEME = THEME_PRESETS.flatMap((preset) =>
  (['light', 'dark'] as const).map((mode) => [preset.key, mode] as const),
);

describe('theme contrast', () => {
  it.each(EVERY_THEME)('%s %s: warning and info chips have readable labels', (preset, mode) => {
    const { palette } = createAppTheme(preset, mode);
    expect(
      getContrastRatio(palette.warning.main, palette.warning.contrastText),
    ).toBeGreaterThanOrEqual(AA_TEXT);
    expect(getContrastRatio(palette.info.main, palette.info.contrastText)).toBeGreaterThanOrEqual(
      AA_TEXT,
    );
  });

  it.each(EVERY_THEME)(
    '%s %s: the current tab and sidebar row read on the primary fill, and on its hover',
    (preset, mode) => {
      const { palette } = createAppTheme(preset, mode);
      // DetailTabs and SidebarNav write the active item in this colour.
      const text = palette.getContrastText(palette.primary.main);
      expect(getContrastRatio(palette.primary.main, text)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(getContrastRatio(palette.primary.dark, text)).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );
});
