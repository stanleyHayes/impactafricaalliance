import type { PublicImpactStory, StoryBlock } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
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
    <Container>
      <Stack
        direction="row"
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        gap={1.25}
        sx={{ py: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650, mr: 1 }}>
          <Box component="time" dateTime={story.publishedAt}>
            {formatStoryDate(story.publishedAt)}
          </Box>
        </Typography>
        {programme && <Chip size="small" label={programme} variant="outlined" />}
        {story.country && <Chip size="small" label={story.country} variant="outlined" />}
      </Stack>
    </Container>
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
    <Stack spacing={4} sx={{ maxWidth: 760, mx: 'auto' }}>
      {story.tags.length > 0 && (
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={0.8} aria-label="Topics">
          {story.tags.map((tag) => (
            <Chip key={tag} size="small" label={tag} />
          ))}
        </Stack>
      )}
      {!preview && (
        <Box>
          <Typography sx={{ mb: 1.5, fontSize: '0.85rem', fontWeight: 700 }}>
            Share this story
          </Typography>
          <ShareLinks story={story} />
        </Box>
      )}
      <MintSurface sx={{ p: { xs: 3.5, md: 5 }, borderRadius: 4 }}>
        <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
          Keep reading
        </Typography>
        <Typography variant="h4" component="p" sx={{ mt: 1, maxWidth: 560 }}>
          More stories of what the work has changed.
        </Typography>
        <Button
          component={RouterLink}
          to="/impact/stories"
          variant="contained"
          color="secondary"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ mt: 3 }}
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
      <Box sx={{ py: { xs: 7, md: 10 } }}>
        <StoryBlocks blocks={rest} />
      </Box>
      <Box sx={{ pb: { xs: 8, md: 12 } }}>
        <StoryFooter story={story} preview={preview} />
      </Box>
    </Box>
  );
};
