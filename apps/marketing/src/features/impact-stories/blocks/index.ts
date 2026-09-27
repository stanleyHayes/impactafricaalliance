import type { StoryBlockType } from '@iaa/shared';
import type { ComponentType } from 'react';

import { ImageBlock, QuoteBlock, RichTextBlock } from './ContentBlocks';
import { CtaBlock } from './CtaBlock';
import type { StoryBlockProps } from './frame';
import { GalleryBlock } from './GalleryBlock';
import { HeroBlock } from './HeroBlock';
import { MetricsBlock, PartnersBlock, TimelineBlock } from './ListBlocks';
import { VideoBlock } from './VideoBlock';

/**
 * How each block type is drawn. A map rather than a switch, so a block type
 * added to the shared list fails to compile until the site can draw it.
 */
export const STORY_BLOCK_RENDERERS: {
  [T in StoryBlockType]: ComponentType<StoryBlockProps<T>>;
} = {
  hero: HeroBlock,
  'rich-text': RichTextBlock,
  image: ImageBlock,
  gallery: GalleryBlock,
  video: VideoBlock,
  quote: QuoteBlock,
  metrics: MetricsBlock,
  timeline: TimelineBlock,
  partners: PartnersBlock,
  cta: CtaBlock,
};

export type { StoryBlockProps } from './frame';
export { HeroBlock, LEAD_HERO_MIN_HEIGHT } from './HeroBlock';
