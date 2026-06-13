import { ORG, PILLARS, brandColors, type ImpactStat, type Story } from '@iaa/shared';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EastIcon from '@mui/icons-material/East';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { m } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';

import { AnimatedCounter } from '../components/AnimatedCounter';
import { ArticleCard, PillarCard } from '../components/cards';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { CardGridSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { useArticles, useImpactStats, useStories } from '../lib/content-hooks';
import { getStatIcon } from '../lib/stat-icons';

const HERO_MODEL = [
  {
    title: 'Skills',
    text: 'Practical learning that moves with people.',
    icon: <SchoolRoundedIcon />,
  },
  {
    title: 'Community',
    text: 'Programmes shaped around local needs.',
    icon: <GroupsRoundedIcon />,
  },
  {
    title: 'Partnership',
    text: 'Shared delivery with trusted allies.',
    icon: <HandshakeRoundedIcon />,
  },
] as const;

const MISSION_POINTS = [
  'African-led programme design',
  'Measurable skills and opportunity',
  'Partnerships built for long-term change',
] as const;

const Hero = (): JSX.Element => (
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
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${IMAGES.hero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transform: 'scale(1.025)',
      }}
    />
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(90deg, rgba(8,31,19,0.94) 0%, rgba(8,31,19,0.78) 50%, rgba(8,31,19,0.46) 100%), linear-gradient(0deg, rgba(8,31,19,0.66), transparent 58%)',
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
        border: '1px solid rgba(212,160,23,0.16)',
        borderRadius: '50%',
        boxShadow: '0 0 0 54px rgba(212,160,23,0.025), 0 0 0 108px rgba(212,160,23,0.016)',
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
      <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center" sx={{ width: '100%' }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box
            component={m.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.5 }}>
              <Box sx={{ width: 38, height: 2, bgcolor: 'secondary.main' }} />
              <Typography
                variant="overline"
                sx={{ color: 'secondary.light', fontWeight: 750, letterSpacing: 2 }}
              >
                Impact Africa Alliance
              </Typography>
            </Stack>
            <Typography
              variant="h1"
              sx={{
                maxWidth: 760,
                color: 'common.white',
                fontSize: { xs: '2.8rem', sm: '3.5rem', md: '4.65rem' },
                lineHeight: 1.02,
              }}
            >
              Empowering Africa, one community at a time.
            </Typography>
            <Typography
              sx={{
                maxWidth: 650,
                mt: 3,
                color: 'rgba(255,255,255,0.76)',
                fontSize: { xs: '1rem', md: '1.14rem' },
                lineHeight: 1.75,
              }}
            >
              We equip youth, women, and communities with practical skills, trusted partnerships,
              and opportunities to build a prosperous and equitable future.
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
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box
            sx={{
              ml: 'auto',
              maxWidth: 390,
              p: 2,
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.9)',
                color: 'text.primary',
              }}
            >
              <Typography
                variant="overline"
                sx={{ color: 'primary.main', fontWeight: 750, letterSpacing: 1.5 }}
              >
                Our impact model
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {HERO_MODEL.map((item) => (
                  <Stack key={item.title} direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        display: 'grid',
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        placeItems: 'center',
                        borderRadius: 2,
                        bgcolor: 'rgba(26,92,56,0.08)',
                        color: 'primary.main',
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 750, lineHeight: 1.2 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.text}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Container>
  </Box>
);

const MissionStrip = (): JSX.Element => (
  <Box
    component="section"
    sx={{
      bgcolor: 'background.paper',
      borderBottom: 1,
      borderColor: 'rgba(26,92,56,0.1)',
      py: { xs: 5, md: 6 },
    }}
  >
    <Container>
      <Grid container spacing={3} alignItems="center">
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h4" sx={{ maxWidth: 520, fontSize: { xs: '1.65rem', md: '2rem' } }}>
            Sustainable impact, built with clarity and care.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {MISSION_POINTS.map((point) => (
              <Stack
                key={point}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  flex: 1,
                  p: 1.5,
                  border: 1,
                  borderColor: 'rgba(26,92,56,0.1)',
                  borderRadius: 2.5,
                  bgcolor: '#F7F9F7',
                }}
              >
                <CheckCircleRoundedIcon sx={{ color: 'primary.main', fontSize: 19 }} />
                <Typography variant="body2" sx={{ fontWeight: 650, lineHeight: 1.45 }}>
                  {point}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Container>
  </Box>
);

const HomeImpactMetric = ({ stat, index }: { stat: ImpactStat; index: number }): JSX.Element => {
  const Icon = getStatIcon(stat.key);

  return (
    <Box
      component="article"
      sx={{
        position: 'relative',
        minHeight: { xs: 210, md: 235 },
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        p: { xs: 3, md: 3.5 },
        transition: 'background-color 220ms ease, transform 220ms ease',
        '&::after': {
          position: 'absolute',
          right: -52,
          bottom: -70,
          width: 150,
          height: 150,
          border: '1px solid rgba(26,92,56,0.08)',
          borderRadius: '50%',
          content: '""',
        },
        '&:hover': {
          bgcolor: '#FBFCF9',
          transform: 'translateY(-3px)',
        },
        '&:hover .impact-icon': {
          bgcolor: 'primary.main',
          color: 'common.white',
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box
          className="impact-icon"
          sx={{
            display: 'grid',
            width: 46,
            height: 46,
            placeItems: 'center',
            borderRadius: 2,
            bgcolor: 'rgba(26,92,56,0.08)',
            color: 'primary.main',
            transition: 'background-color 220ms ease, color 220ms ease',
          }}
        >
          <Icon sx={{ fontSize: 23 }} aria-hidden />
        </Box>
        <Typography
          aria-hidden="true"
          sx={{
            color: 'rgba(26,92,56,0.22)',
            fontSize: '0.72rem',
            fontWeight: 750,
            letterSpacing: 1.8,
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative', zIndex: 1, mt: 4 }}>
        <AnimatedCounter value={stat.value} suffix={stat.suffix} color="primary.main" />
        <Typography
          sx={{
            maxWidth: 210,
            mt: 1,
            color: 'text.secondary',
            fontSize: { xs: '0.9rem', md: '0.96rem' },
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          {stat.label}
        </Typography>
      </Box>
    </Box>
  );
};

const HomeImpactSkeleton = (): JSX.Element => (
  <Grid container spacing={4} alignItems="stretch">
    <Grid size={{ xs: 12, md: 4 }}>
      <Stack spacing={2}>
        <Skeleton width={150} />
        <Skeleton height={52} />
        <Skeleton height={52} width="84%" />
        <Skeleton height={72} />
        <Skeleton variant="rounded" width={180} height={46} sx={{ borderRadius: 999 }} />
      </Stack>
    </Grid>
    <Grid size={{ xs: 12, md: 8 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: '1px',
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          borderRadius: 4,
          bgcolor: 'divider',
        }}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={235}
            sx={{ bgcolor: 'rgba(26,92,56,0.08)' }}
          />
        ))}
      </Box>
    </Grid>
  </Grid>
);

export const HomeImpactSection = (): JSX.Element => {
  const { data, isLoading } = useImpactStats();
  if (!isLoading && (!data || data.items.length === 0)) {
    return <></>;
  }

  const stats = data?.items ?? [];

  return (
    <Box
      component="section"
      aria-labelledby="home-impact-title"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#F1F5EF',
        py: { xs: 8, md: 12 },
        '&::before': {
          position: 'absolute',
          top: -150,
          left: -130,
          width: 360,
          height: 360,
          border: '1px solid rgba(26,92,56,0.08)',
          borderRadius: '50%',
          boxShadow: '0 0 0 48px rgba(26,92,56,0.02), 0 0 0 96px rgba(26,92,56,0.015)',
          content: '""',
        },
      }}
    >
      <Container sx={{ position: 'relative' }}>
        {isLoading ? (
          <HomeImpactSkeleton />
        ) : (
          <Grid container spacing={{ xs: 5, md: 7 }} alignItems="stretch">
            <Grid size={{ xs: 12, md: 4 }}>
              <SectionReveal fillHeight>
                <Box
                  sx={{
                    display: 'flex',
                    height: '100%',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                  }}
                >
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <Box sx={{ width: 34, height: 2, bgcolor: 'secondary.main' }} />
                    <Typography
                      variant="overline"
                      sx={{ color: 'success.main', fontWeight: 750, letterSpacing: 1.7 }}
                    >
                      Our Impact at a Glance
                    </Typography>
                  </Stack>

                  <Typography
                    id="home-impact-title"
                    variant="h2"
                    sx={{
                      mt: 2,
                      maxWidth: 420,
                      fontSize: { xs: '2rem', md: '2.8rem' },
                      lineHeight: 1.12,
                    }}
                  >
                    Progress you can see. Change people can feel.
                  </Typography>
                  <Typography
                    sx={{
                      maxWidth: 430,
                      mt: 2.5,
                      color: 'text.secondary',
                      fontSize: '1rem',
                      lineHeight: 1.75,
                    }}
                  >
                    Our programmes turn skills, partnerships, and local leadership into measurable
                    opportunity across African communities.
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                      mt: 3.5,
                      p: 1.5,
                      pr: 2,
                      border: 1,
                      borderColor: 'rgba(26,92,56,0.1)',
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255,255,255,0.55)',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        width: 40,
                        height: 40,
                        placeItems: 'center',
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'common.white',
                      }}
                    >
                      <InsightsRoundedIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 750, letterSpacing: 0.6 }}>
                        LIVE SNAPSHOT
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        Current programme reach
                      </Typography>
                    </Box>
                  </Stack>

                  <Button
                    component={RouterLink}
                    to="/impact"
                    variant="text"
                    endIcon={<EastIcon />}
                    sx={{ mt: 3, px: 0, fontWeight: 750 }}
                  >
                    Explore our full impact
                  </Button>
                </Box>
              </SectionReveal>
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                  gridAutoRows: 'minmax(210px, auto)',
                  gap: '1px',
                  overflow: 'hidden',
                  border: 1,
                  borderColor: 'rgba(26,92,56,0.12)',
                  borderRadius: 4,
                  bgcolor: 'rgba(26,92,56,0.12)',
                  boxShadow: '0 28px 70px -54px rgba(18,66,42,0.8)',
                  '& > :last-child:nth-child(odd)': {
                    gridColumn: { sm: '1 / -1' },
                  },
                }}
              >
                {stats.map((stat, index) => (
                  <SectionReveal key={stat.key} delay={index * 0.06}>
                    <HomeImpactMetric stat={stat} index={index} />
                  </SectionReveal>
                ))}
              </Box>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

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
        bgcolor: brandColors.offWhite,
        py: { xs: 8, md: 12 },
        '&::before': {
          position: 'absolute',
          top: -180,
          right: -150,
          width: 420,
          height: 420,
          border: '1px solid rgba(26,92,56,0.08)',
          borderRadius: '50%',
          boxShadow: '0 0 0 58px rgba(26,92,56,0.02)',
          content: '""',
        },
      }}
    >
      <Container sx={{ position: 'relative' }}>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="stretch">
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
                  bgcolor: 'primary.dark',
                  color: 'common.white',
                  '&::after': {
                    position: 'absolute',
                    right: -95,
                    bottom: -145,
                    width: 300,
                    height: 300,
                    border: '1px solid rgba(212,160,23,0.18)',
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
                      bgcolor: 'rgba(212,160,23,0.14)',
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
        color: 'common.white',
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
      borderColor: 'rgba(26,92,56,0.12)',
      borderRadius: 4,
      bgcolor: 'background.paper',
      boxShadow: '0 24px 54px -46px rgba(18,66,42,0.8)',
      transition: 'transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
      '&:hover': {
        borderColor: 'rgba(26,92,56,0.3)',
        boxShadow: '0 30px 62px -44px rgba(18,66,42,0.76)',
        transform: 'translateY(-5px)',
      },
      '&::after': featured
        ? {
            position: 'absolute',
            right: -60,
            bottom: -90,
            width: 190,
            height: 190,
            border: '1px solid rgba(212,160,23,0.12)',
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
            color: 'secondary.main',
            fontSize: featured ? 42 : 32,
            transform: 'scaleX(-1)',
          }}
        />
        <Typography
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 750, letterSpacing: 1.4 }}
        >
          {story.program}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontFamily: "'Playfair Display', Georgia, serif",
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
    <Section eyebrow="From the Frontlines" title="Latest News">
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
    sx={{ position: 'relative', overflow: 'hidden', color: 'common.white', py: { xs: 8, md: 12 } }}
  >
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${IMAGES.programs['women-empowerment']})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
    <Box sx={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(13,40,26,0.82)' }} />
    <Container sx={{ position: 'relative' }}>
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
    <HomeImpactSection />
    <Section
      eyebrow="What We Do"
      title="Four Transformative Initiatives"
      subtitle="One mission: a prosperous, inclusive Africa."
      textAlign="center"
      bgcolor={brandColors.offWhite}
    >
      <Grid container spacing={3}>
        {PILLARS.map((pillar) => (
          <Grid key={pillar.key} size={{ xs: 12, sm: 6, md: 3 }} sx={{ display: 'flex' }}>
            <SectionReveal fillHeight>
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
