import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { ArticleCard } from '../components/cards';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { CardGridSkeleton } from '../components/skeletons';
import { useArticles } from '../lib/content-hooks';

const News = (): JSX.Element => {
  const { data, isLoading, isError } = useArticles();
  const articles = data?.items ?? [];

  const renderArticles = (): JSX.Element => {
    if (isLoading) {
      return <CardGridSkeleton count={6} />;
    }
    if (isError) {
      return (
        <Typography color="text.secondary">
          We couldn&apos;t load the news right now. Please try again shortly.
        </Typography>
      );
    }
    if (articles.length === 0) {
      return (
        <Typography color="text.secondary">
          No articles have been published yet. Check back soon for stories from the field.
        </Typography>
      );
    }
    return (
      <Grid container spacing={3}>
        {articles.map((article) => (
          <Grid key={article.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <ArticleCard article={article} />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <>
      <Seo
        title="News & Stories"
        description="Updates, stories, and insights from Impact Africa Alliance's work across the continent."
      />
      <PageHero
        title="From the Frontlines"
        subtitle="Updates, stories, and insights from our work across the continent."
      />
      <Section>{renderArticles()}</Section>
    </>
  );
};

export default News;
