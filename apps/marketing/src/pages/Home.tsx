import { ORG, PILLARS, brandColors, brandFonts, type Story } from '@iaa/shared';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import EastIcon from '@mui/icons-material/East';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ArticleCard, PillarCard } from '../components/cards';
import { HeroHeadline } from '../components/HeroHeadline';
import { HeroImpactModel } from '../components/HeroImpactModel';
import { ImpactMetrics } from '../components/ImpactMetrics';
import { MissionStatement } from '../components/MissionStatement';
import { PageCta } from '../components/PageCta';
import { ParallaxShowcase } from '../components/ParallaxShowcase';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { CardGridSkeleton } from '../components/skeletons';
import { StaggerGrid, StaggerItem } from '../components/StaggerGrid';
import { Watermark } from '../components/Watermark';
import { useArticles, usePageCopy, useStories, type PageCopyDefaults } from '../lib/content-hooks';
import {
  usePillarImage,
  useSiteImage,
  useSiteImageMap,
  useShowcaseImageMap,
} from '../lib/site-images';

/**
 * The rotating hero. Slide one is the home hero slot; the rest are the four
 * programme photographs, so replacing a pillar photo in the dashboard updates
 * the carousel too rather than leaving it showing last year's picture.
 */
const HERO_STORY = [
  { key: 'digital-skills', label: 'Digital skills for work and enterprise' },
  { key: 'stem-learning', label: 'Accessible STEM learning across communities' },
  { key: 'youth-inclusion', label: 'Young people ready for work' },
  { key: 'women-empowerment', label: 'Women leading economic change' },
] as const;

const Hero = ({ copy, heroImage }: { copy: PageCopyDefaults; heroImage: string }): JSX.Element => {
  const pillarImage = usePillarImage();
  const [activeSlide, setActiveSlide] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % (HERO_STORY.length + 1));
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const story = [
    { image: heroImage, position: 'center', label: 'Youth building practical digital skills' },
    ...HERO_STORY.map((slide) => ({
      image: pillarImage(slide.key),
      position: 'center',
      label: slide.label,
    })),
  ];

  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        minHeight: { xs: 620, md: 720 },
        overflow: 'hidden',
        bgcolor: 'primary.dark',
        color: 'common.white',
      }}
    >
      {story.map((slide, index) => (
        <Box
          key={slide.image}
          role="img"
          aria-label={index === activeSlide ? slide.label : undefined}
          aria-hidden={index !== activeSlide}
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${slide.image})`,
            backgroundPosition: slide.position,
            backgroundSize: 'cover',
            opacity: index === activeSlide ? 1 : 0,
            transform: index === activeSlide ? 'scale(1.04)' : 'scale(1)',
            transition: 'opacity 1.1s ease, transform 7s ease',
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              transform: 'none',
            },
          }}
        />
      ))}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(0,30,20,0.94) 0%, rgba(0,30,20,0.78) 50%, rgba(0,30,20,0.46) 100%), linear-gradient(0deg, rgba(0,30,20,0.66), transparent 58%)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: -180, md: -70 },
          bottom: -270,
          width: { xs: 430, md: 640 },
          height: { xs: 430, md: 640 },
          border: `1px solid ${alpha(brandColors.gold, 0.16)}`,
          borderRadius: '50%',
          boxShadow: '0 0 0 54px rgba(245,184,0,0.025), 0 0 0 108px rgba(245,184,0,0.016)',
        }}
      />

      <Container
        sx={{
          position: 'relative',
          display: 'flex',
          minHeight: { xs: 620, md: 720 },
          alignItems: 'center',
          py: { xs: 8, md: 10 },
        }}
      >
        <Grid container spacing={{ xs: 5, md: 7 }} sx={{ alignItems: 'center', width: '100%' }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              component={m.div}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.45 }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.5 }}>
                <Box sx={{ width: 38, height: 2, bgcolor: 'secondary.main' }} />
                <Typography
                  variant="overline"
                  sx={{ color: 'secondary.light', fontWeight: 750, letterSpacing: 2 }}
                >
                  {copy.heroEyebrow}
                </Typography>
              </Stack>
              <HeroHeadline key={copy.heroTitle} text={copy.heroTitle} />
              <Typography
                sx={{
                  maxWidth: 650,
                  mt: 3,
                  color: 'rgba(255,255,255,0.76)',
                  fontSize: { xs: '1rem', md: '1.14rem' },
                  lineHeight: 1.75,
                }}
              >
                {copy.heroSubtitle}
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
                  sx={{
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.42)',
                    '&:hover': {
                      borderColor: 'secondary.light',
                      bgcolor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  Partner With Us
                </Button>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 4 }}
                aria-label="Featured impact stories"
              >
                {story.map((slide, index) => (
                  <Box
                    component="button"
                    key={slide.label}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Show story ${index + 1}: ${slide.label}`}
                    aria-current={index === activeSlide ? 'true' : undefined}
                    sx={{
                      width: index === activeSlide ? 34 : 9,
                      height: 9,
                      p: 0,
                      border: 0,
                      borderRadius: 99,
                      bgcolor: index === activeSlide ? 'secondary.main' : 'rgba(255,255,255,0.48)',
                      cursor: 'pointer',
                      transition: 'width 240ms ease, background-color 240ms ease',
                      '&:focus-visible': { outline: '2px solid white', outlineOffset: 3 },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
            <HeroImpactModel />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export const HomeImpactSection = (): JSX.Element => (
  <Box
    component="section"
    aria-labelledby="home-impact-title"
    sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}
  >
    <Container>
      <Grid container spacing={{ xs: 2.5, md: 5 }} sx={{ alignItems: 'end', mb: { xs: 3, md: 4 } }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{ width: 34, height: 2, bgcolor: 'secondary.main' }} />
            <Typography
              variant="overline"
              sx={{ color: 'text.primary', fontWeight: 750, letterSpacing: 1.7 }}
            >
              Our Impact at a Glance
            </Typography>
          </Stack>
          <Typography
            id="home-impact-title"
            variant="h2"
            sx={{
              mt: 1.5,
              maxWidth: 640,
              fontSize: { xs: '2rem', md: '2.8rem' },
              lineHeight: 1.12,
            }}
          >
            Progress you can see. Change people can feel.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
            Our programmes turn skills, partnerships, and local leadership into measurable
            opportunity across African communities.
          </Typography>
          <Button
            component={RouterLink}
            to="/impact"
            variant="text"
            endIcon={<EastIcon />}
            sx={{ mt: 1, px: 0, fontWeight: 750 }}
          >
            Explore our full impact
          </Button>
        </Grid>
      </Grid>
      <ImpactMetrics />
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mt: 2, color: 'text.secondary' }}
      >
        <InsightsRoundedIcon sx={{ fontSize: 18 }} aria-hidden />
        <Typography variant="caption">Current programme reach</Typography>
      </Stack>
    </Container>
  </Box>
);

const StoriesSection = (): JSX.Element => {
  const { data, isLoading } = useStories();
  if (!isLoading && (!data || data.items.length === 0)) {
    return <></>;
  }
  const stories = data?.items.slice(0, 3) ?? [];
  return (
    <Box
      component="section"
      aria-labelledby="stories-title"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
        py: { xs: 8, md: 12 },
        '&::before': {
          position: 'absolute',
          top: -180,
          right: -150,
          width: 420,
          height: 420,
          border: '1px solid rgba(0,30,20,0.08)',
          borderRadius: '50%',
          boxShadow: '0 0 0 58px rgba(0,30,20,0.02)',
          content: '""',
        },
      }}
    >
      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 4, md: 6 }} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <SectionReveal fillHeight>
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  height: '100%',
                  minHeight: { xs: 340, md: 520 },
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  p: { xs: 3.5, md: 4 },
                  borderRadius: 4,
                  bgcolor: brandColors.deepForest,
                  color: 'common.white',
                  '&::after': {
                    position: 'absolute',
                    right: -95,
                    bottom: -145,
                    width: 300,
                    height: 300,
                    border: `1px solid ${alpha(brandColors.gold, 0.18)}`,
                    borderRadius: '50%',
                    content: '""',
                  },
                }}
              >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box sx={{ width: 34, height: 2, bgcolor: 'secondary.main' }} />
                    <Typography
                      variant="overline"
                      sx={{ color: 'secondary.light', fontWeight: 750, letterSpacing: 1.7 }}
                    >
                      Real People. Real Change.
                    </Typography>
                  </Stack>
                  <Typography
                    id="stories-title"
                    variant="h2"
                    sx={{ mt: 2, color: 'common.white', fontSize: { xs: '2rem', md: '2.65rem' } }}
                  >
                    Stories of Impact
                  </Typography>
                  <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.68)', lineHeight: 1.75 }}>
                    The numbers matter, but the truest evidence is personal: confidence gained,
                    doors opened, communities strengthened.
                  </Typography>
                </Box>

                <Box sx={{ position: 'relative', zIndex: 1, mt: 4 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      width: 54,
                      height: 54,
                      placeItems: 'center',
                      borderRadius: 2.5,
                      bgcolor: 'rgba(245,184,0,0.14)',
                      color: 'secondary.light',
                    }}
                  >
                    <AutoStoriesRoundedIcon />
                  </Box>
                  <Button
                    component={RouterLink}
                    to="/news"
                    variant="contained"
                    color="secondary"
                    endIcon={<EastIcon />}
                    sx={{ mt: 3 }}
                  >
                    Read more stories
                  </Button>
                </Box>
              </Box>
            </SectionReveal>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            {isLoading ? <StoriesSkeleton /> : <StoriesGrid stories={stories} />}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

const StoriesSkeleton = (): JSX.Element => (
  <Grid container spacing={2.5}>
    {Array.from({ length: 3 }, (_, index) => (
      <Grid key={index} size={{ xs: 12, sm: index === 0 ? 12 : 6 }}>
        <Skeleton variant="rounded" height={index === 0 ? 300 : 220} sx={{ borderRadius: 4 }} />
      </Grid>
    ))}
  </Grid>
);

const StoryPerson = ({ story }: { story: Story }): JSX.Element => (
  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
    <Avatar
      src={story.photo?.url}
      alt={story.name}
      sx={{
        width: 52,
        height: 52,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        fontWeight: 800,
      }}
    >
      {story.name.charAt(0)}
    </Avatar>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 750 }}>{story.name}</Typography>
      <Typography variant="body2" color="text.secondary">
        {story.country} · {story.program}
      </Typography>
    </Box>
  </Stack>
);

const StoryImpactCard = ({
  story,
  featured,
}: {
  story: Story;
  featured?: boolean;
}): JSX.Element => (
  <Box
    component="article"
    sx={{
      position: 'relative',
      display: 'flex',
      height: '100%',
      minHeight: featured ? { xs: 360, md: 340 } : 260,
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      p: { xs: 3, md: featured ? 4 : 3 },
      border: 1,
      borderColor: 'divider',
      borderRadius: 4,
      bgcolor: 'background.paper',
      boxShadow: '0 24px 54px -46px rgba(0,0,0,0.14)',
      transition: 'transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
      '&:hover': {
        borderColor: (theme) =>
          theme.palette.mode === 'light' ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.22)',
        boxShadow: '0 30px 62px -44px rgba(0,0,0,0.18)',
        transform: 'translateY(-5px)',
      },
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
      '&::after': featured
        ? {
            position: 'absolute',
            right: -60,
            bottom: -90,
            width: 190,
            height: 190,
            border: '1px solid rgba(245,184,0,0.12)',
            borderRadius: '50%',
            content: '""',
          }
        : undefined,
    }}
  >
    <Box sx={{ position: 'relative', zIndex: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <FormatQuoteRoundedIcon
          sx={{
            color: 'text.secondary',
            fontSize: featured ? 42 : 32,
            transform: 'scaleX(-1)',
          }}
        />
        <Typography
          variant="overline"
          sx={{ color: 'text.primary', fontWeight: 750, letterSpacing: 1.4 }}
        >
          {story.program}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontFamily: brandFonts.body,
          fontSize: featured ? { xs: '1.35rem', md: '1.55rem' } : '1.08rem',
          fontStyle: 'italic',
          lineHeight: featured ? 1.62 : 1.7,
        }}
      >
        {story.quote}
      </Typography>
    </Box>
    <StoryPerson story={story} />
  </Box>
);

const StoriesGrid = ({ stories }: { stories: Story[] }): JSX.Element => {
  const [featuredStory, ...supportingStories] = stories;

  if (!featuredStory) {
    return <></>;
  }

  return (
    <Grid container spacing={2.5}>
      <Grid size={12}>
        <SectionReveal>
          <StoryImpactCard story={featuredStory} featured />
        </SectionReveal>
      </Grid>
      {supportingStories.map((story, index) => (
        <Grid key={story.slug} size={{ xs: 12, sm: 6 }}>
          <SectionReveal delay={index * 0.06} fillHeight>
            <StoryImpactCard story={story} />
          </SectionReveal>
        </Grid>
      ))}
    </Grid>
  );
};

const NewsSection = (): JSX.Element => {
  const { data, isLoading } = useArticles();
  const articles = data?.items.slice(0, 3) ?? [];
  if (!isLoading && articles.length === 0) {
    return <></>;
  }
  return (
    <Section
      eyebrow="From the Frontlines"
      title="Latest News"
      watermark="radar"
      watermarkPosition="top-right"
    >
      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <Grid container spacing={3}>
          {articles.map((article) => (
            <Grid key={article.id} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
              <ArticleCard article={article} />
            </Grid>
          ))}
        </Grid>
      )}
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button component={RouterLink} to="/news" endIcon={<EastIcon />}>
          View All News
        </Button>
      </Box>
    </Section>
  );
};

const VisionQuote = (): JSX.Element => {
  const image = useSiteImageMap();
  return (
  <Box
    sx={{ position: 'relative', overflow: 'hidden', color: 'common.white', py: { xs: 8, md: 12 } }}
  >
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${image('home-vision-band')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
    <Box sx={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(13,40,26,0.82)' }} />
    <Watermark
      variant="contours"
      position="bottom-left"
      size={{ xs: 260, md: 420 }}
      opacity={0.06}
      sx={{ color: 'secondary.main' }}
    />
    <Container sx={{ position: 'relative', zIndex: 1 }}>
      <SectionReveal>
        <Typography
          variant="h4"
          sx={{
            fontFamily: brandFonts.body,
            fontStyle: 'italic',
            maxWidth: 880,
            mx: 'auto',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          “Africa’s greatest resource is its people. When we invest in their potential, we change
          individual lives and the trajectory of an entire continent.”
        </Typography>
        <Typography sx={{ textAlign: 'center', mt: 3, color: 'primary.main', fontWeight: 700 }}>
          Emmanuel Mbansi, President, {ORG.name}
        </Typography>
        <Typography
          sx={{
            textAlign: 'center',
            maxWidth: 720,
            mt: 3,
            mx: 'auto',
            color: 'rgba(255,255,255,0.78)',
            lineHeight: 1.75,
          }}
        >
          Impact Africa Alliance was founded by a generation of young African leaders who refused to
          wait for change and decided to be it.
        </Typography>
      </SectionReveal>
    </Container>
  </Box>
);
};

const Home = (): JSX.Element => {
  const showcaseImage = useShowcaseImageMap();
  const homeHero = useSiteImage('home-hero');
  const copy = usePageCopy('home', {
    seoTitle: 'Empowering Youth, Women & Communities Across Africa',
    seoDescription:
      'Impact Africa Alliance equips youth, women, and communities across Africa with the skills, tools, and opportunities to build a prosperous and equitable future.',
    heroEyebrow: 'Impact Africa Alliance',
    heroTitle: 'Empowering Africa, one community at a time.',
    heroSubtitle:
      'We equip youth, women, and communities with practical skills, trusted partnerships, and opportunities to build a prosperous and equitable future.',
    introEyebrow: 'What We Do',
    introTitle: 'Four Transformative Initiatives',
    introBody: 'One mission: a prosperous, inclusive Africa.',
  });

  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <Hero copy={copy} heroImage={copy.heroImageUrl ?? homeHero} />
      <MissionStatement />
      <HomeImpactSection />
      <Section
        eyebrow={copy.introEyebrow}
        title={copy.introTitle}
        subtitle={copy.introBody}
        textAlign="center"
        bgcolor="background.default"
      >
        <StaggerGrid>
          <Grid container spacing={3}>
            {PILLARS.map((pillar) => (
              <Grid key={pillar.key} size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
                <StaggerItem sx={{ display: 'flex', width: '100%' }}>
                  <PillarCard pillar={pillar} />
                </StaggerItem>
              </Grid>
            ))}
          </Grid>
        </StaggerGrid>
      </Section>
      <ParallaxShowcase
        eyebrow="On the ground"
        title="The work looks like people."
        subtitle="Not slide decks or pilot schemes. Classrooms, workshops, market stalls and offices across Ghana, Nigeria and Sierra Leone, where the skills we teach turn into work people are paid for."
        panels={[
          {
            ...showcaseImage(
              'home-showcase-lead',
              'AI-generated illustration of young adults collaborating on digital skills at a laptop',
            ),
            caption: 'Digital skills',
            drift: 0.18,
          },
          {
            ...showcaseImage(
              'home-showcase-women',
              'AI-generated illustration of women entrepreneurs reviewing textiles and business plans',
            ),
            caption: 'Women leading',
            drift: 0.32,
          },
          {
            ...showcaseImage(
              'home-showcase-work',
              'AI-generated illustration of young professionals working with a workplace coach',
            ),
            caption: 'Ready for work',
            drift: 0.24,
          },
        ]}
      />
      <VisionQuote />
      <StoriesSection />
      <NewsSection />
      <PageCta copy={copy} />
    </>
  );
};

export default Home;
