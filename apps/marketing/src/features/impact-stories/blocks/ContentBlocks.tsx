import { brandFonts } from '@iaa/shared';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Markdown } from '../../../components/Markdown';
import { cloudinaryUrl } from '../../../lib/cloudinary-image';
import { StoryImage } from '../StoryImage';

import { BlockFrame, type StoryBlockProps } from './frame';

/** Narrative in Markdown. No raw HTML is rendered, so nothing in it can run (plan D16). */
export const RichTextBlock = ({ data }: StoryBlockProps<'rich-text'>): JSX.Element => (
  <BlockFrame width="text">
    <Box sx={{ '& > :first-of-type': { mt: 0 }, '& > :last-child': { mb: 0 } }}>
      <Markdown>{data.markdown}</Markdown>
    </Box>
  </BlockFrame>
);

/** One photo across the column, with its caption. */
export const ImageBlock = ({ data }: StoryBlockProps<'image'>): JSX.Element => (
  <BlockFrame width="wide">
    <Box component="figure" sx={{ m: 0 }}>
      <StoryImage
        image={data.image}
        layout={{ xs: '100vw', lg: '1152px' }}
        sx={{ width: '100%', borderRadius: { xs: 2, md: 4 } }}
      />
      {data.caption && (
        <Typography
          component="figcaption"
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1.5, maxWidth: 760, mx: 'auto', textAlign: 'center' }}
        >
          {data.caption}
        </Typography>
      )}
    </Box>
  </BlockFrame>
);

/** Someone's own words, in the look of the home page's impact stories. */
export const QuoteBlock = ({ data }: StoryBlockProps<'quote'>): JSX.Element => (
  <BlockFrame width="text">
    <Box
      component="figure"
      sx={{
        position: 'relative',
        m: 0,
        p: { xs: 3, md: 4.5 },
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        borderRadius: 4,
        bgcolor: 'background.paper',
        boxShadow: '0 24px 54px -46px rgba(0,0,0,0.14)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: (theme) =>
            `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
        },
      }}
    >
      <FormatQuoteRoundedIcon
        aria-hidden
        sx={{ color: 'text.secondary', fontSize: 42, transform: 'scaleX(-1)' }}
      />
      <Box component="blockquote" sx={{ m: 0, mt: 1 }}>
        <Typography
          sx={{
            fontFamily: brandFonts.body,
            fontSize: { xs: '1.3rem', md: '1.55rem' },
            fontStyle: 'italic',
            lineHeight: 1.62,
          }}
        >
          {data.text}
        </Typography>
      </Box>
      {(data.attribution || data.photo) && (
        <Stack
          component="figcaption"
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ mt: 3 }}
        >
          {data.photo && (
            <Avatar
              src={cloudinaryUrl(data.photo.url, { width: 112 })}
              alt={data.photo.alt ?? data.attribution ?? ''}
              sx={{ width: 56, height: 56 }}
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            {data.attribution && (
              <Typography sx={{ fontWeight: 750 }}>{data.attribution}</Typography>
            )}
            {data.role && (
              <Typography variant="body2" color="text.secondary">
                {data.role}
              </Typography>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  </BlockFrame>
);
