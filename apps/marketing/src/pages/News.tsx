import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ArticleCard } from '../components/cards';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { useArticles } from '../lib/content-hooks';

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
        bgcolor: 'rgba(26,92,56,0.08)',
        color: 'primary.main',
      }}
    >
      <AutoStoriesRoundedIcon />
    </Box>
    <Typography color="text.secondary">{children}</Typography>
  </Box>
);

const News = (): JSX.Element => {
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
      return (
        <NewsMessage>
          No articles have been published yet. Check back soon for stories from the field.
        </NewsMessage>
      );
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
                  sx={{ color: 'success.main', fontWeight: 700, letterSpacing: 1.5 }}
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
      <Seo
        title="News & Stories"
        description="Updates, stories, and insights from Impact Africa Alliance's work across the continent."
      />
      <PageHero
        eyebrow="News & Insights"
        title="From the Frontlines"
        subtitle="Updates, stories, and insights from our work across the continent."
      />
      <Section>{renderArticles()}</Section>
    </>
  );
};

export default News;
