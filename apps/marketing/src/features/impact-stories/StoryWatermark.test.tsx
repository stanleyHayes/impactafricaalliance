import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../test/test-utils';

import { StoryWatermark, watermarkFor } from './StoryWatermark';

describe('story watermarks', () => {
  it('gives a story the same pattern every time', () => {
    expect(watermarkFor('digital-skills-hubs')).toBe(watermarkFor('digital-skills-hubs'));
  });

  it('mixes the house patterns across a grid of stories', () => {
    const slugs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map(
      (letter) => `story-${letter}`,
    );
    expect(new Set(slugs.map(watermarkFor)).size).toBeGreaterThanOrEqual(2);
  });

  it('stays out of the way of screen readers and clicks', () => {
    const { container } = renderWithProviders(
      <StoryWatermark variant="radar" color="primary.main" />,
    );
    const mark = container.querySelector('.story-watermark');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveStyle({ pointerEvents: 'none' });
  });
});
