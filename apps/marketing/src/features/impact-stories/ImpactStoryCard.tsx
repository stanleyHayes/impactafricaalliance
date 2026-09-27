import type { PublicImpactStoryListItem } from '@iaa/shared';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import EastIcon from '@mui/icons-material/East';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { formatStoryDate, programmeLabel } from './story-utils';
import { StoryImage } from './StoryImage';

const clamp = (lines: number) =>
  ({
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }) as const;

/** A published story as a card on the stories page, with an editorial image and reading panel. */
export const ImpactStoryCard = ({ story }: { story: PublicImpactStoryListItem }): JSX.Element => {
  const programme = programmeLabel(story.programme);
  return (
    <Card
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        overflow: 'hidden',
        border: 0,
        borderRadius: 2,
        boxShadow: 'none',
        bgcolor: 'background.paper',
        transition: 'transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease',
        '&:hover': {
          boxShadow: 'none',
          transform: 'translateY(-3px)',
        },
        '&:hover .story-img': { transform: 'scale(1.045)' },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
          '&:hover .story-img': { transform: 'none' },
        },
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={`/impact/stories/${story.slug}`}
        aria-label={`Read ${story.title}`}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
          '&.Mui-focusVisible': {
            outline: '3px solid',
            outlineColor: 'text.primary',
            outlineOffset: -3,
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            aspectRatio: '16 / 9',
            overflow: 'hidden',
            bgcolor: 'primary.dark',
          }}
        >
          {story.cover ? (
            <Box className="story-img" sx={{ height: '100%', transition: 'transform 500ms ease' }}>
              <StoryImage
                image={story.cover}
                layout={{ xs: '100vw', sm: '50vw', md: '50vw' }}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          ) : (
            <Box
              aria-hidden
              sx={{
                display: 'grid',
                placeItems: 'center',
                height: '100%',
                background:
                  'radial-gradient(circle at 25% 25%, rgba(245,184,0,0.25), transparent 24%), linear-gradient(145deg, #001E14, #0B3D2E)',
              }}
            >
              <AutoStoriesRoundedIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.2)' }} />
            </Box>
          )}
        </Box>
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            p: { xs: 2.5, md: 3.5 },
            borderBottom: 2,
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              mb: 1.5,
              fontWeight: 700,
              letterSpacing: 1.2,
              color: 'text.secondary',
              lineHeight: 1.6,
            }}
          >
            {programme ?? 'Impact story'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, mb: 1.5 }}>
            {formatStoryDate(story.publishedAt)}
            {story.country ? ` · ${story.country}` : ''}
          </Typography>
          <Typography
            component="h3"
            variant="h6"
            sx={{
              fontSize: { xs: '1.45rem', md: '1.8rem' },
              letterSpacing: '-0.035em',
              lineHeight: 1.2,
              ...clamp(3),
            }}
          >
            {story.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.5, flexGrow: 1, lineHeight: 1.65, ...clamp(3) }}
          >
            {story.excerpt}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 3, pt: 1.5 }}
          >
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 750 }}>Read story</Typography>
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <EastIcon fontSize="small" aria-hidden />
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};
