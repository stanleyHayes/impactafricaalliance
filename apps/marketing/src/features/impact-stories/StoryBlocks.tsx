import type { StoryBlock, StoryBlockType } from '@iaa/shared';
import Stack from '@mui/material/Stack';
import type { ComponentType } from 'react';

import { SectionReveal } from '../../components/SectionReveal';

import { STORY_BLOCK_RENDERERS, type StoryBlockProps } from './blocks';

/**
 * A story's blocks in order, each rising into view as it is reached (still,
 * for anyone who prefers reduced motion).
 *
 * A block type this build of the site does not know, from an API newer than
 * the page, is left out rather than breaking the story around it.
 */
export const StoryBlocks = ({ blocks }: { blocks: readonly StoryBlock[] }): JSX.Element => (
  <Stack spacing={{ xs: 7, md: 10 }}>
    {blocks.map((block) => {
      const Renderer = STORY_BLOCK_RENDERERS[block.type] as
        ComponentType<StoryBlockProps<StoryBlockType>> | undefined;
      if (!Renderer) return null;
      return (
        <SectionReveal key={block.id}>
          <Renderer data={block.data} />
        </SectionReveal>
      );
    })}
  </Stack>
);
