import type { PublicImpactStory, StoryBlock } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EastIcon from '@mui/icons-material/East';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import XIcon from '@mui/icons-material/X';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { MintSurface } from '../../components/MintSurface';

import { HeroBlock } from './blocks';
import { formatStoryDate, programmeLabel, storyUrl } from './story-utils';
import { StoryBlocks } from './StoryBlocks';
import { StoryWatermark, WATERMARK_HOST_SX } from './StoryWatermark';

const BackLink = (): JSX.Element => (
  <Link
    component={RouterLink}
    to="/impact/stories"
    underline="none"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
      mb: { xs: 4, md: 6 },
      color: 'rgba(255,255,255,0.8)',
      fontSize: '0.88rem',
      fontWeight: 650,
      '&:hover': { color: 'common.white' },
    }}
  >
    <ArrowBackRoundedIcon fontSize="small" />
    All impact stories
  </Link>
);

/** Share links, as on news articles, pointing at the story's public address. */
const ShareLinks = ({ story }: { story: PublicImpactStory }): JSX.Element => {
  const url = encodeURIComponent(storyUrl(story.slug));
  const title = encodeURIComponent(story.title);
  const links = [
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      Icon: LinkedInIcon,
    },
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      Icon: XIcon,
    },
    {
      label: 'Share by email',
      href: `mailto:?subject=${title}&body=${url}`,
      Icon: EmailRoundedIcon,
    },
    {
      label: 'Share on WhatsApp',
      href: `https://wa.me/?text=${title}%20${url}`,
      Icon: WhatsAppIcon,
    },
  ];
  return (
    <Stack direction="row" spacing={1}>
      {links.map(({ label, href, Icon }) => {
        const email = href.startsWith('mailto:');
        return (
          <IconButton
            key={label}
            component="a"
            href={href}
            target={email ? undefined : '_blank'}
            rel={email ? undefined : 'noopener noreferrer'}
            aria-label={label}
            sx={{ border: 1, borderColor: 'divider', color: 'text.primary' }}
          >
            <Icon fontSize="small" />
          </IconButton>
        );
      })}
    </Stack>
  );
};

/** Date, programme and place, under the opening. */
const StoryDetails = ({ story }: { story: PublicImpactStory }): JSX.Element => {
  const programme = programmeLabel(story.programme);
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Container>
        <Box
          component="dl"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1.6fr 0.8fr' },
            m: 0,
            py: { xs: 3, md: 4 },
            gap: { xs: 2.5, md: 5 },
          }}
        >
          <Box>
            <Typography
              component="dt"
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 1.5 }}
            >
              Published
            </Typography>
            <Typography component="dd" sx={{ m: 0, mt: 0.75, fontWeight: 650 }}>
              <Box component="time" dateTime={story.publishedAt}>
                {formatStoryDate(story.publishedAt)}
              </Box>
            </Typography>
          </Box>
          {programme && (
            <Box>
              <Typography
                component="dt"
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1.5 }}
              >
                Programme
              </Typography>
              <Typography component="dd" sx={{ m: 0, mt: 0.75, fontWeight: 650 }}>
                {programme}
              </Typography>
            </Box>
          )}
          {story.country && (
            <Box>
              <Typography
                component="dt"
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1.5 }}
              >
                Location
              </Typography>
              <Typography component="dd" sx={{ m: 0, mt: 0.75, fontWeight: 650 }}>
                {story.country}
              </Typography>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

const StoryFooter = ({
  story,
  preview,
}: {
  story: PublicImpactStory;
  preview: boolean;
}): JSX.Element => (
  <Container>
    <Stack spacing={4}>
      {story.tags.length > 0 && (
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.8} aria-label="Topics">
          {story.tags.map((tag) => (
            <Chip key={tag} size="small" label={tag} />
          ))}
        </Stack>
      )}
      {!preview && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            pt: 3,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography sx={{ mb: 0, fontSize: '0.85rem', fontWeight: 700 }}>
            Share this story
          </Typography>
          <ShareLinks story={story} />
        </Box>
      )}
      <MintSurface
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          gap: 3,
          alignItems: 'center',
          ...WATERMARK_HOST_SX,
        }}
      >
        <StoryWatermark variant="network" color="common.black" opacity={0.08} size={240} />
        <Box>
          <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
            Keep reading
          </Typography>
          <Typography variant="h4" component="p" sx={{ mt: 1, maxWidth: 560 }}>
            More stories of what the work has changed.
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/impact/stories"
          variant="contained"
          color="secondary"
          endIcon={<EastIcon />}
          sx={{
            justifySelf: 'start',
          }}
        >
          More stories
        </Button>
      </MintSurface>
    </Stack>
  </Container>
);

/** The opening hero: the story's own first block, or one made from its title and cover. */
const openingOf = (
  story: PublicImpactStory,
): { opening: Extract<StoryBlock, { type: 'hero' }>['data']; rest: StoryBlock[] } => {
  const [first, ...rest] = story.blocks;
  if (first?.type === 'hero') return { opening: first.data, rest };
  return {
    opening: {
      heading: story.title,
      subheading: story.excerpt,
      image: story.cover ?? null,
      ...(programmeLabel(story.programme) ? { eyebrow: programmeLabel(story.programme) } : {}),
    },
    rest: story.blocks,
  };
};

/**
 * One impact story as the public reads it, shared by the story page and the
 * staff preview so a preview is exactly what will be published.
 *
 * A story that opens with a hero block uses it as the page heading; any other
 * story opens with its title over its cover.
 */
export const StoryArticle = ({
  story,
  preview = false,
}: {
  story: PublicImpactStory;
  preview?: boolean;
}): JSX.Element => {
  const { opening, rest } = openingOf(story);
  return (
    <Box component="article">
      <HeroBlock data={opening} lead meta={<BackLink />} />
      <StoryDetails story={story} />
      <Box
        sx={{
          py: { xs: 6, md: 9 },
          '& h2': { letterSpacing: '-0.035em', lineHeight: 1.2 },
          '& blockquote': { borderRadius: 2 },
        }}
      >
        <StoryBlocks blocks={rest} />
      </Box>
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <StoryFooter story={story} preview={preview} />
      </Box>
    </Box>
  );
};
