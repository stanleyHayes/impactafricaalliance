import type { StoryBlockData, StoryBlockType } from '@iaa/shared';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** What every block renderer receives. */
export interface StoryBlockProps<T extends StoryBlockType> {
  data: StoryBlockData<T>;
  /**
   * True for a hero that opens the page: it carries the page's one `h1` and
   * loads its picture first.
   */
  lead?: boolean;
  /** Shown above a leading hero's heading, such as the link back to all stories. */
  meta?: ReactNode;
}

/**
 * The column a block sits in. Reading text stays near 70 characters a line;
 * pictures, numbers and partners get the full container.
 */
export const BlockFrame = ({
  width,
  children,
}: {
  width: 'text' | 'wide';
  children: ReactNode;
}): JSX.Element => (
  <Container>
    <Box sx={{ maxWidth: width === 'text' ? 760 : 'none', mx: 'auto' }}>{children}</Box>
  </Container>
);

/** A block's own heading, one level under the page's. */
export const BlockHeading = ({ children }: { children: ReactNode }): JSX.Element => (
  <Typography
    component="h2"
    variant="h3"
    sx={{ mb: { xs: 3, md: 4 }, fontSize: { xs: '1.7rem', md: '2.2rem' }, fontWeight: 800 }}
  >
    {children}
  </Typography>
);
