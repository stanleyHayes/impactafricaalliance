import type { StoryBlockType } from '@iaa/shared';
import type { ComponentType } from 'react';

import type { BlockFieldsProps } from './fields';
import { MetricsBlockEditor, PartnersBlockEditor, TimelineBlockEditor } from './ListBlockEditors';
import { GalleryBlockEditor, ImageBlockEditor, VideoBlockEditor } from './MediaBlockEditors';
import {
  CtaBlockEditor,
  HeroBlockEditor,
  QuoteBlockEditor,
  RichTextBlockEditor,
} from './TextBlockEditors';

/**
 * The editor for each block type. A map rather than a switch, so adding a
 * block type to the shared list fails to compile until it has an editor.
 */
export const BLOCK_FIELD_EDITORS: {
  [T in StoryBlockType]: ComponentType<BlockFieldsProps<T>>;
} = {
  hero: HeroBlockEditor,
  'rich-text': RichTextBlockEditor,
  image: ImageBlockEditor,
  gallery: GalleryBlockEditor,
  video: VideoBlockEditor,
  quote: QuoteBlockEditor,
  metrics: MetricsBlockEditor,
  timeline: TimelineBlockEditor,
  partners: PartnersBlockEditor,
  cta: CtaBlockEditor,
};

export type { BlockFieldsProps } from './fields';
