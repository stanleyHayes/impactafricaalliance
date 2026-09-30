import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { surfaceSx } from '../../theme/surfaces';

export interface DetailSectionProps {
  title: string;
  /** Shown in the tinted square and, faintly, as a watermark. Defaults to a document. */
  icon?: JSX.Element;
  /** One line under the title saying what the section holds. */
  description?: string;
  /** Right-aligned control in the header, such as an Add or Edit button. */
  action?: ReactNode;
  /** Anchor for in-page links (`#milestones`); the header clears the fixed top bar when jumped to. */
  id?: string;
  children: ReactNode;
}

/**
 * A card section with a tinted header, for detail pages: a project's
 * milestones, an application's answers, a task's checklist.
 *
 * The card is MUI's, so it follows the skin from the theme; the header strip
 * and the icon square read the skin's tint and tile tokens, whose Classic
 * values are the ones this section always had. The watermark is decoration
 * in the text colour and is the same in every skin.
 *
 * The same look as the sections on the event page, which keeps its own
 * private copy. That one guesses its icon from the title with patterns; here
 * the page says which icon it means, because the work modules name sections
 * the patterns would not recognise.
 */
export const DetailSection = ({
  title,
  icon,
  description,
  action,
  id,
  children,
}: DetailSectionProps): JSX.Element => {
  const glyph = icon ?? <DescriptionOutlinedIcon />;
  return (
    <Card
      component="section"
      id={id}
      variant="outlined"
      aria-label={title}
      // The top bar is 72px and fixed; without this an anchor jump hides the heading under it.
      sx={{ borderRadius: 3, overflow: 'hidden', scrollMarginTop: 96 }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: { xs: 2.5, md: 3.5 },
          py: 2.5,
          position: 'relative',
          overflow: 'hidden',
          ...surfaceSx.tinted,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            right: 20,
            top: -22,
            color: (theme) => alpha(theme.palette.text.primary, 0.06),
            pointerEvents: 'none',
            '& svg': { fontSize: 110 },
          }}
        >
          {glyph}
        </Box>
        <Box
          aria-hidden
          sx={{
            display: 'grid',
            placeItems: 'center',
            p: 1,
            borderRadius: 1.5,
            ...surfaceSx.tileInset,
          }}
        >
          {glyph}
        </Box>
        <Box sx={{ position: 'relative', minWidth: 0, flexGrow: 1 }}>
          <Typography component="h2" variant="h6">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ position: 'relative', flexShrink: 0 }}>{action}</Box>}
      </Stack>
      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>{children}</Box>
    </Card>
  );
};
