import { brandColors } from '@iaa/shared';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';

const RESOURCE_CARDS = [
  {
    icon: ArticleRoundedIcon,
    title: 'Blog & Thought Leadership',
    description:
      'Insights, updates, and stories from across our programmes and the African development ecosystem.',
    action: { label: 'Read the blog', to: '/news' },
  },
  {
    icon: DownloadRoundedIcon,
    title: 'Research & Reports',
    description:
      'Download annual reports, impact briefs, programme overviews, and strategic documents.',
    action: { label: 'View reports', to: '/impact' },
  },
  {
    icon: MenuBookRoundedIcon,
    title: 'Media Kit',
    description:
      'Logos, brand guidelines, press releases, and fact sheets for partners and journalists.',
    action: { label: 'Request media kit', to: '/contact' },
  },
  {
    icon: EmailRoundedIcon,
    title: 'Newsletters',
    description:
      'Subscribe to our newsletter for quarterly updates, opportunities, and stories of change.',
    action: { label: 'Subscribe', to: '/get-involved' },
  },
  {
    icon: CalendarMonthRoundedIcon,
    title: 'Event Calendar',
    description:
      'Upcoming webinars, cohort launches, partner forums, and community events across West Africa.',
    action: { label: 'View events', to: '/events' },
  },
] as const;

const ResourceCard = ({
  card,
}: {
  card: (typeof RESOURCE_CARDS)[number];
}): JSX.Element => {
  const Icon = card.icon;
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        flexDirection: 'column',
        p: { xs: 3, md: 3.5 },
        border: '1px solid rgba(0,30,20,0.1)',
        borderRadius: 4,
        bgcolor: 'background.paper',
        transition: 'transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
        '&:hover': {
          borderColor: alpha(brandColors.mint, 0.4),
          boxShadow: `0 24px 54px -46px ${alpha(brandColors.mint, 0.25)}`,
          transform: 'translateY(-4px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          width: 50,
          height: 50,
          placeItems: 'center',
          borderRadius: 2,
          bgcolor: alpha(brandColors.mint, 0.1),
          color: 'text.primary',
        }}
      >
        <Icon />
      </Box>
      <Typography variant="h5" sx={{ mt: 2.5, fontSize: '1.25rem' }}>
        {card.title}
      </Typography>
      <Typography sx={{ mt: 1, color: 'text.secondary', lineHeight: 1.7, flex: 1 }}>
        {card.description}
      </Typography>
      <Button
        component={RouterLink}
        to={card.action.to}
        variant="text"
        sx={{ mt: 2.5, alignSelf: 'flex-start', px: 0, fontWeight: 700 }}
      >
        {card.action.label}
      </Button>
    </Box>
  );
};

/** Resources hub: blog, reports, media kit, newsletters, and events. */
const Resources = (): JSX.Element => (
  <>
    <Seo
      title="Resources"
      description="Explore IAA resources: blog articles, research and reports, media kit, newsletters, and upcoming events."
    />
    <Box
      component="header"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'common.black',
        color: 'common.white',
        py: { xs: 8, md: 12 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          right: { xs: -120, md: -60 },
          bottom: { xs: -160, md: -120 },
          width: { xs: 300, md: 420 },
          height: { xs: 300, md: 420 },
          border: `1px solid ${alpha(brandColors.mint, 0.15)}`,
          borderRadius: '50%',
        }}
      />
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.5 }}>
          <Box sx={{ width: 38, height: 2, bgcolor: 'primary.main' }} />
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 750, letterSpacing: 2 }}
          >
            Resources
          </Typography>
        </Stack>
        <Typography
          variant="h1"
          sx={{
            maxWidth: 760,
            fontSize: { xs: '2.6rem', sm: '3.25rem', md: '4rem' },
            lineHeight: 1.05,
          }}
        >
          Knowledge, stories, and tools for impact.
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
          Explore our latest thinking, download reports, access media assets, and stay up to date
          with events across the Alliance.
        </Typography>
      </Container>
    </Box>

    <Section watermark="contours" watermarkPosition="top-left">
      <Grid container spacing={3}>
        {RESOURCE_CARDS.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
            <SectionReveal fillHeight>
              <ResourceCard card={card} />
            </SectionReveal>
          </Grid>
        ))}
      </Grid>
    </Section>
  </>
);

export default Resources;
