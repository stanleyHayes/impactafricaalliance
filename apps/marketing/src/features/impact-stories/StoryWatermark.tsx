import Box from '@mui/material/Box';

import { Watermark, type WatermarkVariant } from '../../components/Watermark';

/**
 * The round patterns suit a card's corner. The contour lines are left out: they
 * are a wide strip of fine lines drawn for full-width section backgrounds, and
 * shrunk into a corner they all but disappear.
 */
const PATTERNS: readonly WatermarkVariant[] = ['network', 'radar', 'africa'];

/**
 * How much each pattern's ink is strengthened so all of them read alike at one
 * opacity: the Africa rings already draw their lines at 10-35% opacity inside
 * the artwork, and the contours are 1.5px hairlines.
 */
const PATTERN_WEIGHT: Record<WatermarkVariant, number> = {
  network: 1,
  radar: 1.15,
  africa: 1.9,
  contours: 1.6,
};

/**
 * One of the house patterns, picked from the story's slug: a grid of stories
 * mixes them, but a story always wears the same one wherever it appears.
 */
export const watermarkFor = (slug: string): WatermarkVariant => {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PATTERNS[hash % PATTERNS.length] ?? 'network';
};

/**
 * Spread into the sx of a panel that holds a StoryWatermark. It clips the
 * pattern to the panel and lifts the panel's own content above it, so text is
 * never drawn underneath the artwork.
 */
export const WATERMARK_HOST_SX = {
  position: 'relative',
  overflow: 'hidden',
  '& > :not(.story-watermark)': { position: 'relative', zIndex: 1 },
} as const;

interface StoryWatermarkProps {
  variant: WatermarkVariant;
  /** A palette path such as 'primary.main', or a colour. */
  color: string;
  opacity?: number;
  size?: number;
}

/**
 * A still watermark tucked into a panel's bottom-right corner. It is decorative
 * (hidden from assistive technology, never catches a click). A card may turn it
 * on hover by targeting `.story-watermark`; the turn is dropped for anyone who
 * asks their system for less motion.
 */
export const StoryWatermark = ({
  variant,
  color,
  opacity = 0.16,
  size = 240,
}: StoryWatermarkProps): JSX.Element => {
  // The contour lines are a wide strip, so they need more width to read as
  // strongly as the round patterns do at the same size.
  const width = variant === 'contours' ? size * 1.6 : size;
  return (
    <Box
      className="story-watermark"
      aria-hidden
      sx={{
        position: 'absolute',
        right: -size * 0.16,
        bottom: -size * 0.16,
        width,
        height: size,
        pointerEvents: 'none',
        transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {/* Centred inside the wrapper, which switches the pattern's own drift off:
        in a grid of cards a dozen slowly moving patterns would be noise. */}
      <Watermark
        variant={variant}
        color={color}
        opacity={Math.min(0.35, opacity * PATTERN_WEIGHT[variant])}
        size={width}
        position="center"
      />
    </Box>
  );
};
