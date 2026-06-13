import { ORG, PILLARS, brandColors } from '@iaa/shared';
import EastIcon from '@mui/icons-material/East';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { m } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';

import { AnimatedCounter } from '../components/AnimatedCounter';
import { ArticleCard, PillarCard, StoryCard } from '../components/cards';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { CardGridSkeleton, StatsSkeleton } from '../components/skeletons';
import { DEFAULT_STATS, DEFAULT_STORIES } from '../content/fallbacks';
import { useArticles, useImpactStats, useStories } from '../lib/content-hooks';

const Hero = (): JSX.Element => (
  <Box
    sx={{
      position: 'relative',
      color: 'common.white',
      py: { xs: 10, md: 16 },
      background: `linear-gradient(115deg, ${brandColors.forestGreen} 0%, #103A24 55%, ${brandColors.charcoalBlack} 100%)`,
    }}
  >
    <Container>
      <Box
        component={m.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <Typography variant="h1" sx={{ fontSize: { xs: '2.6rem', md: '4rem' }, maxWidth: 880 }}>
          Empowering{' '}
          <Box
            component={m.span}
            sx={{ color: 'secondary.main' }}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Africa
          </Box>
          .
          <br />
          One Community at a Time.
        </Typography>
        <Typography variant="h6" sx={{ mt: 3, maxWidth: 680, fontWeight: 400, opacity: 0.92 }}>
          We equip youth, women, and communities across Africa with the skills, tools, and
          opportunities to build a prosperous and equitable future.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
          <Button
            component={RouterLink}
            to="/our-work"
            variant="contained"
            color="secondary"
            size="large"
          >
            Discover Our Work
          </Button>
          <Button
            component={RouterLink}
            to="/get-involved#partner"
            variant="outlined"
            size="large"
            endIcon={<EastIcon />}
            sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }}
          >
            Partner With Us
          </Button>
        </Stack>
      </Box>
    </Container>
  </Box>
);

const MissionStrip = (): JSX.Element => (
  <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: { xs: 5, md: 7 } }}>
    <Container>
      <Typography
        variant="h4"
        textAlign="center"
        sx={{ fontWeight: 600, maxWidth: 900, mx: 'auto' }}
      >
        Driving sustainable impact across Africa through innovation, education, and empowerment.
      </Typography>
    </Container>
  </Box>
);

const ImpactCounters = (): JSX.Element => {
  const { data, isLoading } = useImpactStats();
  const stats = data && data.items.length > 0 ? data.items : DEFAULT_STATS;
  return (
    <Section eyebrow="Our Impact at a Glance" textAlign="center">
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <Grid container spacing={3}>
          {stats.map((stat) => (
            <Grid key={stat.key} size={{ xs: 6, md: 3 }}>
              <Stack alignItems="center" spacing={1}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                <Typography variant="subtitle1" textAlign="center" color="text.secondary">
                  {stat.label}
                </Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}
    </Section>
  );
};

interface DisplayStory {
  slug: string;
  name: string;
  country: string;
  program: string;
  quote: string;
  photoUrl?: string;
}

const StoriesSection = (): JSX.Element => {
  const { data, isLoading } = useStories();
  const stories: DisplayStory[] =
    data && data.items.length > 0
      ? data.items.slice(0, 3).map((story) => ({
          slug: story.slug,
          name: story.name,
          country: story.country,
          program: story.program,
          quote: story.quote,
          photoUrl: story.photo?.url,
        }))
      : DEFAULT_STORIES.map((story) => ({ ...story }));
  return (
    <Section
      eyebrow="Real People. Real Change."
      title="Stories of Impact"
      bgcolor={brandColors.offWhite}
    >
      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <Grid container spacing={3}>
          {stories.map((story) => (
            <Grid key={story.slug} size={{ xs: 12, sm: 6, md: 4 }}>
              <SectionReveal>
                <StoryCard
                  name={story.name}
                  country={story.country}
                  program={story.program}
                  quote={story.quote}
                  photoUrl={story.photoUrl}
                />
              </SectionReveal>
            </Grid>
          ))}
        </Grid>
      )}
    </Section>
  );
};

const NewsSection = (): JSX.Element => {
  const { data, isLoading } = useArticles();
  const articles = data?.items.slice(0, 3) ?? [];
  if (!isLoading && articles.length === 0) {
    return <></>;
  }
  return (
    <Section eyebrow="From the Frontlines" title="Latest News">
      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <Grid container spacing={3}>
          {articles.map((article) => (
            <Grid key={article.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ArticleCard article={article} />
            </Grid>
          ))}
        </Grid>
      )}
      <Box textAlign="center" sx={{ mt: 4 }}>
        <Button component={RouterLink} to="/news" endIcon={<EastIcon />}>
          View All News
        </Button>
      </Box>
    </Section>
  );
};

const VisionQuote = (): JSX.Element => (
  <Box
    sx={{
      background: `linear-gradient(160deg, ${brandColors.forestGreen}, ${brandColors.charcoalBlack})`,
      color: 'common.white',
      py: { xs: 8, md: 12 },
    }}
  >
    <Container>
      <SectionReveal>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic',
            maxWidth: 880,
            mx: 'auto',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          “Africa’s greatest resource is its people. When we invest in their potential, we don’t
          just change individual lives — we change the trajectory of an entire continent.”
        </Typography>
        <Typography textAlign="center" sx={{ mt: 3, color: 'secondary.light', fontWeight: 700 }}>
          — Emmanuel Bansay, Co-Founder, {ORG.name}
        </Typography>
      </SectionReveal>
    </Container>
  </Box>
);

const Home = (): JSX.Element => (
  <>
    <Seo
      title="Empowering Youth, Women & Communities Across Africa"
      description="Impact Africa Alliance equips youth, women, and communities across Africa with the skills, tools, and opportunities to build a prosperous and equitable future."
    />
    <Hero />
    <MissionStrip />
    <ImpactCounters />
    <Section
      eyebrow="What We Do"
      title="Four Transformative Initiatives"
      subtitle="One mission: a prosperous, inclusive Africa."
      textAlign="center"
      bgcolor={brandColors.offWhite}
    >
      <Grid container spacing={3}>
        {PILLARS.map((pillar) => (
          <Grid key={pillar.key} size={{ xs: 12, sm: 6, md: 3 }}>
            <SectionReveal>
              <PillarCard pillar={pillar} />
            </SectionReveal>
          </Grid>
        ))}
      </Grid>
    </Section>
    <VisionQuote />
    <StoriesSection />
    <NewsSection />
  </>
);

export default Home;
