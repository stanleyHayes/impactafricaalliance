import { brandColors } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import EastIcon from '@mui/icons-material/East';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import NewspaperRoundedIcon from '@mui/icons-material/NewspaperRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { ArticleCard } from '../components/cards';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { useArticles, usePageCopy } from '../lib/content-hooks';

const NewsSkeleton = (): JSX.Element => (
  <Stack spacing={6}>
    <Skeleton variant="rounded" height={440} sx={{ borderRadius: 4 }} />
    <Grid container spacing={3}>
      {Array.from({ length: 3 }, (_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
          <Card variant="outlined">
            <Skeleton variant="rectangular" height={230} />
            <Box sx={{ p: 3 }}>
              <Skeleton width="55%" />
              <Skeleton height={34} sx={{ mt: 1.5 }} />
              <Skeleton />
              <Skeleton width="82%" />
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Stack>
);

const NewsMessage = ({ children }: { children: string }): JSX.Element => (
  <Box
    sx={{
      maxWidth: 640,
      mx: 'auto',
      px: 4,
      py: 7,
      border: 1,
      borderColor: 'divider',
      borderRadius: 4,
      bgcolor: 'background.paper',
      textAlign: 'center',
    }}
  >
    <Box
      sx={{
        display: 'grid',
        width: 64,
        height: 64,
        mx: 'auto',
        mb: 2,
        placeItems: 'center',
        borderRadius: '50%',
        bgcolor: 'rgba(0,30,20,0.08)',
        color: 'text.primary',
      }}
    >
      <AutoStoriesRoundedIcon />
    </Box>
    <Typography color="text.secondary">{children}</Typography>
  </Box>
);

const COMING_TOPICS: ReadonlyArray<{ label: string; Icon: SvgIconComponent }> = [
  { label: 'Programme updates', Icon: CampaignRoundedIcon },
  { label: 'Stories from the field', Icon: PublicRoundedIcon },
  { label: 'Research & insights', Icon: InsightsRoundedIcon },
  { label: 'Partner announcements', Icon: HandshakeRoundedIcon },
];

/**
 * Shown before the first article is published. An empty feed is the first
 * thing many visitors see, so it explains what will land here and points them
 * at live pages rather than dead-ending on "nothing to see".
 */
const NewsEmptyState = (): JSX.Element => (
  <Card
    sx={{ overflow: 'hidden', borderRadius: 4, boxShadow: '0 28px 70px -56px rgba(18,66,42,0.9)' }}
  >
    <Grid container>
      <Grid
        size={{ xs: 12, md: 5 }}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: { xs: 4, md: 5 },
        }}
      >
        <AutoStoriesRoundedIcon
          aria-hidden
          sx={{
            position: 'absolute',
            right: -26,
            bottom: -30,
            color: alpha(brandColors.deepForest, 0.08),
            fontSize: 210,
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'grid',
              width: 62,
              height: 62,
              placeItems: 'center',
              borderRadius: 2.5,
              bgcolor: 'secondary.main',
              color: brandColors.charcoalBlack,
            }}
          >
            <NewspaperRoundedIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h4" sx={{ mt: 3 }}>
            The first stories are being written.
          </Typography>
          <Typography sx={{ mt: 2, color: alpha(brandColors.deepForest, 0.76), lineHeight: 1.75 }}>
            Our newsroom opens as the current cohort of programmes reaches the field. Everything
            published here comes straight from the communities we work in.
          </Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }} sx={{ p: { xs: 4, md: 5 } }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.primary', fontWeight: 800, letterSpacing: 1.6 }}
        >
          Nothing published yet
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.75 }}>
          What will land on this page
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.75 }}>
          In the meantime, the work itself is already documented — our programmes, the numbers
          behind them, and the ways to take part are all live.
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1.25} sx={{ mt: 3 }}>
          {COMING_TOPICS.map(({ label, Icon }) => (
            <Chip
              key={label}
              icon={<Icon />}
              label={label}
              variant="outlined"
              sx={{
                borderColor: 'rgba(0,30,20,0.24)',
                color: 'text.primary',
                fontWeight: 700,
                '& .MuiChip-icon': { color: 'text.secondary' },
              }}
            />
          ))}
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3.5 }}>
          <Button
            component={RouterLink}
            to="/our-work"
            variant="contained"
            endIcon={<EastIcon />}
            sx={{ fontWeight: 750 }}
          >
            Explore our work
          </Button>
          <Button
            component={RouterLink}
            to="/get-involved"
            variant="outlined"
            sx={{ fontWeight: 750 }}
          >
            Get involved
          </Button>
        </Stack>
      </Grid>
    </Grid>
  </Card>
);

const News = (): JSX.Element => {
  const copy = usePageCopy('news', {
    seoTitle: 'News & Stories',
    seoDescription: "Updates, stories, and insights from Impact Africa Alliance's work across the continent.",
    heroEyebrow: 'News & Insights',
    heroTitle: 'From the Frontlines',
    heroSubtitle: 'Updates, stories, and insights from our work across the continent.',
  });
  const { data, isLoading, isError } = useArticles();
  const articles = data?.items ?? [];

  const renderArticles = (): JSX.Element => {
    if (isLoading) {
      return <NewsSkeleton />;
    }
    if (isError) {
      return (
        <NewsMessage>
          We couldn&apos;t load the news right now. Please try again shortly.
        </NewsMessage>
      );
    }
    if (articles.length === 0) {
      return <NewsEmptyState />;
    }

    const [featuredArticle, ...latestArticles] = articles;
    if (!featuredArticle) {
      return <></>;
    }

    return (
      <Stack spacing={{ xs: 6, md: 9 }}>
        <ArticleCard article={featuredArticle} featured />

        {latestArticles.length > 0 && (
          <Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 4 }}
            >
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: 1.5 }}
                >
                  Latest coverage
                </Typography>
                <Typography variant="h3" sx={{ mt: 0.5, fontSize: { xs: '1.7rem', md: '2.2rem' } }}>
                  More from the Alliance
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ maxWidth: 360, fontSize: '0.9rem' }}>
                Field updates, programme milestones, ideas, and stories from across our network.
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              {latestArticles.map((article) => (
                <Grid key={article.id} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                  <ArticleCard article={article} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Stack>
    );
  };

  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <PageHero
        eyebrow={copy.heroEyebrow}
        title={copy.heroTitle}
        subtitle={copy.heroSubtitle}
        image={copy.heroImageUrl}
      />
      <Section watermark="radar" watermarkPosition="bottom-right">{renderArticles()}</Section>
    </>
  );
};

export default News;
