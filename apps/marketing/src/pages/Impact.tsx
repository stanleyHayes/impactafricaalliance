import { SDG_GOALS, brandColors, brandFonts, type Report, type SdgGoal } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EastIcon from '@mui/icons-material/East';
import EngineeringRoundedIcon from '@mui/icons-material/EngineeringRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import FemaleRoundedIcon from '@mui/icons-material/FemaleRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import ParkRoundedIcon from '@mui/icons-material/ParkRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import SolarPowerRoundedIcon from '@mui/icons-material/SolarPowerRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, getContrastRatio } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { ImpactMetrics } from '../components/ImpactMetrics';
import { MintSurface } from '../components/MintSurface';
import { PageCta } from '../components/PageCta';
import { PageHero } from '../components/PageHero';
import { ProgrammeGallery } from '../components/ProgrammeGallery';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { Watermark } from '../components/Watermark';
import { usePageCopy, useReports } from '../lib/content-hooks';
import { useSiteImage } from '../lib/site-images';

/** Official UN SDG brand colours, used to make the goal grid recognisable. */
const SDG_COLORS: Record<number, string> = {
  4: '#C5192D',
  5: '#FF3A21',
  7: '#FCC30B',
  8: '#A21942',
  9: '#FD6925',
  10: '#DD1367',
  13: '#3F7E44',
  17: '#19486A',
};

const SDG_ICONS: Record<number, SvgIconComponent> = {
  4: SchoolRoundedIcon,
  5: FemaleRoundedIcon,
  7: SolarPowerRoundedIcon,
  8: EngineeringRoundedIcon,
  9: LightbulbRoundedIcon,
  10: Diversity3RoundedIcon,
  13: ParkRoundedIcon,
  17: HandshakeRoundedIcon,
};

const ASPIRATIONS = [
  { n: '01', text: 'A prosperous Africa, based on inclusive growth and sustainable development.' },
  { n: '02', text: 'An integrated continent, politically united on the ideals of Pan-Africanism.' },
  {
    n: '06',
    text: 'An Africa whose development is people-driven, relying on the potential of its people.',
  },
];

export const ImpactNumbersSection = (): JSX.Element => {
  return (
    <Box
      component="section"
      aria-labelledby="impact-numbers-title"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? theme.palette.background.default : '#E8F5EE',
        color: 'text.primary',
        py: { xs: 8, md: 12 },
        '&::before': {
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 82% 16%, ${alpha(brandColors.gold, 0.12)}, transparent 24%), radial-gradient(circle at 8% 88%, rgba(46,125,79,0.12), transparent 32%)`,
          content: '""',
        },
        '&::after': {
          position: 'absolute',
          top: 0,
          right: 0,
          width: { xs: 210, md: 460 },
          height: '100%',
          backgroundImage:
            'linear-gradient(rgba(14,42,34,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(14,42,34,0.035) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          content: '""',
          maskImage: 'linear-gradient(to left, black, transparent)',
        },
      }}
    >
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4} sx={{ alignItems: 'flex-end', mb: { xs: 5, md: 7 } }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ width: 36, height: 2, bgcolor: 'secondary.main' }} />
              <Typography
                variant="overline"
                sx={{ color: 'text.primary', fontWeight: 700, letterSpacing: 2 }}
              >
                Measured progress
              </Typography>
            </Stack>
            <Typography
              id="impact-numbers-title"
              variant="h2"
              sx={{
                mt: 1.5,
                maxWidth: 760,
                color: 'text.primary',
                fontSize: { xs: '2.25rem', md: '3.5rem' },
                lineHeight: 1.08,
              }}
            >
              By the Numbers
            </Typography>
            <Typography
              sx={{
                maxWidth: 670,
                mt: 2,
                color: 'text.secondary',
                fontSize: { xs: '1rem', md: '1.08rem' },
              }}
            >
              A clear view of the people, places, and partnerships moving our mission forward.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{
                maxWidth: 340,
                ml: { md: 'auto' },
                p: 2,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2.5,
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  placeItems: 'center',
                  borderRadius: '50%',
                  bgcolor: alpha(brandColors.gold, 0.14),
                  color: 'text.primary',
                }}
              >
                <InsightsRoundedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: 0.8 }}>
                  IMPACT SNAPSHOT
                </Typography>
                <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: '0.78rem' }}>
                  Current programme reach
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        <ImpactMetrics />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1.25}
          sx={{ mt: 4.5, color: 'text.secondary' }}
        >
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'secondary.main' }} />
          <Typography variant="caption" sx={{ letterSpacing: 0.2 }}>
            Every figure represents people gaining skills, access, and opportunity.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

const SdgGoalCard = ({ goal, index }: { goal: SdgGoal; index: number }): JSX.Element => {
  const color = SDG_COLORS[goal.number] ?? brandColors.forestGreen;
  const Icon = SDG_ICONS[goal.number] ?? PublicRoundedIcon;
  const foreground =
    getContrastRatio(color, brandColors.white) >= 4.5
      ? brandColors.white
      : brandColors.charcoalBlack;

  return (
    <Box
      component="article"
      sx={{
        display: 'flex',
        width: '100%',
        height: '100%',
        minHeight: { sm: 350 },
        flexDirection: 'column',
        overflow: 'hidden',
        border: 1,
        borderColor: alpha(color, 0.22),
        borderRadius: 4,
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: '0 24px 52px -46px rgba(18,66,42,0.85)',
        transition: 'transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
        '&:hover': {
          borderColor: alpha(color, 0.55),
          boxShadow: `0 28px 58px -42px ${alpha(color, 0.62)}`,
          transform: 'translateY(-5px)',
        },
        '&:hover .sdg-symbol': {
          transform: 'rotate(-4deg) scale(1.08)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          minHeight: 148,
          overflow: 'hidden',
          p: 2.5,
          bgcolor: color,
          color: foreground,
        }}
      >
        <Icon
          className="sdg-symbol"
          aria-hidden
          sx={{
            position: 'absolute',
            right: -10,
            bottom: -18,
            color: foreground,
            fontSize: 118,
            opacity: 0.08,
            maskImage: 'linear-gradient(to right, transparent, black)',
            transition: 'opacity 220ms ease, transform 220ms ease',
          }}
        />
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Box>
            <Typography
              sx={{
                color: 'inherit',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: 1.7,
              }}
            >
              GLOBAL GOAL
            </Typography>
            <Typography
              aria-label={`Goal ${goal.number}`}
              sx={{
                mt: 0.25,
                color: 'inherit',
                fontFamily: brandFonts.body,
                fontSize: '2.75rem',
                fontWeight: 800,
                letterSpacing: '-0.06em',
                lineHeight: 1,
              }}
            >
              {String(goal.number).padStart(2, '0')}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              width: 42,
              height: 42,
              placeItems: 'center',
              border: `1px solid ${alpha(foreground, 0.34)}`,
              borderRadius: 2,
              bgcolor: alpha(foreground, 0.1),
            }}
          >
            <Icon sx={{ fontSize: 22 }} />
          </Box>
        </Stack>
        <Typography
          component="h3"
          sx={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 220,
            mt: 2,
            color: 'inherit',
            fontSize: '1.05rem',
            fontWeight: 750,
            lineHeight: 1.25,
          }}
        >
          {goal.title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexGrow: 1, flexDirection: 'column', p: 2.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 24, height: 2, borderRadius: 99, bgcolor: color }} />
          <Typography
            variant="overline"
            sx={{
              color: 'text.primary',
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: 1.25,
            }}
          >
            IAA contribution
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          sx={{ mt: 1.5, color: 'text.secondary', lineHeight: 1.7, flexGrow: 1 }}
        >
          {goal.contribution}
        </Typography>
        <Typography
          variant="caption"
          sx={{ mt: 2.5, color: 'text.secondary', fontWeight: 750, letterSpacing: 0.4 }}
        >
          {String(index + 1).padStart(2, '0')} / {String(SDG_GOALS.length).padStart(2, '0')}
        </Typography>
      </Box>
    </Box>
  );
};

export const SdgSection = (): JSX.Element => (
  <Box
    component="section"
    aria-labelledby="sdg-section-title"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      bgcolor: (theme) =>
        theme.palette.mode === 'dark' ? theme.palette.background.default : '#EDF3EC',
      color: 'text.primary',
      py: { xs: 8, md: 12 },
      '&::before': {
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(0,30,20,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,30,20,0.035) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        content: '""',
        maskImage: 'linear-gradient(to bottom, black, transparent 65%)',
      },
    }}
  >
    <Watermark
      variant="radar"
      position="bottom-right"
      size={{ xs: 240, md: 380 }}
      opacity={0.05}
      sx={{ color: 'primary.main' }}
    />
    <Container sx={{ position: 'relative', zIndex: 1 }}>
      <Grid container spacing={{ xs: 4, md: 6 }} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{ width: 38, height: 2, borderRadius: 99, bgcolor: 'secondary.main' }} />
            <Typography
              variant="overline"
              sx={{ color: 'text.primary', fontWeight: 750, letterSpacing: 1.8 }}
            >
              Our Contribution to Global Goals
            </Typography>
          </Stack>
          <Typography
            id="sdg-section-title"
            variant="h2"
            sx={{
              maxWidth: 720,
              mt: 1.5,
              fontSize: { xs: '2.1rem', md: '3.2rem' },
              color: 'text.primary',
            }}
          >
            UN Sustainable Development Goals
          </Typography>
          <Typography
            sx={{
              maxWidth: 690,
              mt: 2.25,
              color: 'text.secondary',
              fontSize: { xs: '1rem', md: '1.08rem' },
              lineHeight: 1.8,
            }}
          >
            Our programmes connect local action to a global framework, advancing education,
            equality, decent work, innovation, youth inclusion, and partnership.
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <MintSurface
            sx={{
              position: 'relative',
              display: 'flex',
              height: '100%',
              minHeight: 220,
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden',
              p: { xs: 3, md: 3.5 },
              borderRadius: 4,
              '&::after': {
                position: 'absolute',
                right: -70,
                bottom: -100,
                width: 240,
                height: 240,
                border: `1px solid ${alpha(brandColors.gold, 0.2)}`,
                borderRadius: '50%',
                boxShadow: `0 0 0 34px ${alpha(brandColors.gold, 0.03)}`,
                content: '""',
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ position: 'relative', zIndex: 1 }}
            >
              <Box
                className="mint-glass"
                sx={{
                  display: 'grid',
                  width: 48,
                  height: 48,
                  placeItems: 'center',
                  borderRadius: 2,
                }}
              >
                <PublicRoundedIcon />
              </Box>
              <Typography
                sx={{
                  color: 'rgba(14,42,34,0.35)',
                  fontSize: '0.7rem',
                  fontWeight: 750,
                  letterSpacing: 1.5,
                }}
              >
                LOCAL TO GLOBAL
              </Typography>
            </Stack>
            <Box sx={{ position: 'relative', zIndex: 1, mt: 4 }}>
              <Typography
                sx={{
                  fontFamily: brandFonts.body,
                  fontSize: '3.5rem',
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {SDG_GOALS.length}
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.75 }}>
                priority goals advanced
              </Typography>
              <Typography
                variant="body2"
                sx={{ maxWidth: 350, mt: 1, color: 'rgba(14,42,34,0.64)', lineHeight: 1.65 }}
              >
                Each goal is connected to practical programme delivery and measurable community
                outcomes.
              </Typography>
            </Box>
          </MintSurface>
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: { xs: 5, md: 7 } }}>
        {SDG_GOALS.map((goal, index) => (
          <Grid key={goal.number} size={{ xs: 12, sm: 6, lg: 3 }} sx={{ display: 'flex' }}>
            <SectionReveal delay={index * 0.04} fillHeight>
              <SdgGoalCard goal={goal} index={index} />
            </SectionReveal>
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

const AgendaSection = (): JSX.Element => (
  <Section
    eyebrow="Building the Africa We Want"
    title="Agenda 2063 Alignment"
    bgcolor="background.default"
  >
    <Grid container spacing={3}>
      {ASPIRATIONS.map((aspiration) => (
        <Grid key={aspiration.n} size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <SectionReveal>
            <Card
              sx={{
                width: '100%',
                height: '100%',
                borderRadius: 3,
                p: 3.5,
                position: 'relative',
                overflow: 'hidden',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <PublicRoundedIcon
                sx={{
                  position: 'absolute',
                  right: -14,
                  bottom: -14,
                  fontSize: 110,
                  color: alpha(brandColors.deepForest, 0.06),
                }}
              />
              <Typography
                sx={{
                  fontFamily: brandFonts.body,
                  fontStyle: 'italic',
                  fontSize: '2.6rem',
                  fontWeight: 700,
                  color: 'primary.contrastText',
                  lineHeight: 1,
                }}
              >
                {aspiration.n}
              </Typography>
              <Typography
                variant="overline"
                sx={{ color: 'primary.contrastText', letterSpacing: 1.5 }}
              >
                Aspiration
              </Typography>
              <Typography
                sx={{ mt: 1, position: 'relative', fontSize: '1.05rem', lineHeight: 1.6 }}
              >
                {aspiration.text}
              </Typography>
            </Card>
          </SectionReveal>
        </Grid>
      ))}
    </Grid>
  </Section>
);

const VoicesBand = (): JSX.Element => {
  const banner = useSiteImage('impact-voices-band');
  return (
  <Box sx={{ position: 'relative', overflow: 'hidden', color: 'common.white' }}>
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${banner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
    <Box sx={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(13,40,26,0.78)' }} />
    <Container sx={{ position: 'relative', py: { xs: 8, md: 12 }, textAlign: 'center' }}>
      <Typography
        variant="overline"
        sx={{ color: 'secondary.light', fontWeight: 700, letterSpacing: 2 }}
      >
        Voices of Change
      </Typography>
      <Typography
        variant="h3"
        sx={{
          mt: 1,
          maxWidth: 760,
          mx: 'auto',
          fontWeight: 800,
          fontSize: { xs: '1.7rem', md: '2.6rem' },
        }}
      >
        Behind every statistic is a person whose life has changed.
      </Typography>
      <Button
        component={RouterLink}
        to="/news"
        variant="contained"
        color="secondary"
        size="large"
        endIcon={<EastIcon />}
        sx={{ mt: 4, fontWeight: 700 }}
      >
        Read their stories
      </Button>
    </Container>
  </Box>
);
};

const REPORT_PROMISES = [
  'Programme outcomes and reach',
  'Lessons, challenges, and adaptations',
  'Transparent use of resources',
] as const;

const ReportsSkeleton = (): JSX.Element => (
  <Grid container spacing={2.5}>
    {Array.from({ length: 3 }, (_, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
        <Skeleton variant="rounded" height={330} sx={{ borderRadius: 4 }} />
      </Grid>
    ))}
  </Grid>
);

const ReportCard = ({ report, index }: { report: Report; index: number }): JSX.Element => (
  <Box
    component="article"
    sx={{
      position: 'relative',
      display: 'flex',
      width: '100%',
      height: '100%',
      minHeight: 330,
      flexDirection: 'column',
      overflow: 'hidden',
      p: 3,
      border: 1,
      borderColor: 'divider',
      borderRadius: 4,
      bgcolor: 'background.paper',
      color: 'text.primary',
      boxShadow: '0 24px 52px -46px rgba(18,66,42,0.85)',
      transition: 'transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
      '&::after': {
        position: 'absolute',
        right: -65,
        bottom: -90,
        width: 190,
        height: 190,
        border: '1px solid rgba(197,25,45,0.08)',
        borderRadius: '50%',
        content: '""',
      },
      '&:hover': {
        borderColor: 'text.secondary',
        boxShadow: '0 28px 58px -42px rgba(18,66,42,0.72)',
        transform: 'translateY(-5px)',
      },
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
      <Box
        sx={{
          display: 'grid',
          width: 54,
          height: 54,
          placeItems: 'center',
          borderRadius: 2.5,
          bgcolor: 'action.hover',
          color: (theme) => (theme.palette.mode === 'dark' ? '#FF8A97' : '#C5192D'),
        }}
      >
        <PictureAsPdfRoundedIcon sx={{ fontSize: 28 }} />
      </Box>
      <Typography
        aria-hidden
        sx={{
          color: 'text.secondary',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: 1.5,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </Typography>
    </Stack>

    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{ mt: 3, color: 'text.secondary' }}
    >
      <CalendarMonthRoundedIcon sx={{ fontSize: 17 }} />
      <Typography variant="caption" sx={{ fontWeight: 750, letterSpacing: 0.5 }}>
        {report.year} REPORT
      </Typography>
    </Stack>
    <Typography variant="h5" sx={{ mt: 1, lineHeight: 1.25 }}>
      {report.title}
    </Typography>
    <Typography
      variant="body2"
      sx={{ mt: 1.25, color: 'text.secondary', lineHeight: 1.7, flexGrow: 1 }}
    >
      {report.description || 'Impact results, programme learning, and accountability updates.'}
    </Typography>

    <Button
      href={report.file.url}
      target="_blank"
      rel="noopener noreferrer"
      variant="outlined"
      startIcon={<DownloadRoundedIcon />}
      sx={{
        position: 'relative',
        zIndex: 1,
        mt: 3,
        alignSelf: 'flex-start',
        fontWeight: 700,
        color: 'text.primary',
        borderColor: 'text.secondary',
        '&:hover': { color: 'text.primary', borderColor: 'text.primary', bgcolor: 'action.hover' },
      }}
    >
      Download report
    </Button>
  </Box>
);

const ReportsEmptyState = (): JSX.Element => (
  <Box
    sx={{
      overflow: 'hidden',
      border: 1,
      borderColor: 'divider',
      borderRadius: 4,
      bgcolor: 'background.paper',
      boxShadow: '0 30px 70px -58px rgba(18,66,42,0.85)',
    }}
  >
    <Grid container>
      <Grid
        size={{ xs: 12, md: 5 }}
        sx={{
          position: 'relative',
          display: 'flex',
          minHeight: { xs: 300, md: 430 },
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          p: { xs: 3.5, md: 5 },
          bgcolor: brandColors.forestGreen,
          color: brandColors.white,
          '&::after': {
            position: 'absolute',
            right: -105,
            bottom: -145,
            width: 330,
            height: 330,
            border: `1px solid ${alpha(brandColors.gold, 0.18)}`,
            borderRadius: '50%',
            boxShadow: `0 0 0 46px ${alpha(brandColors.gold, 0.06)}`,
            content: '""',
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ position: 'relative', zIndex: 1 }}
        >
          <Box
            sx={{
              display: 'grid',
              width: 58,
              height: 58,
              placeItems: 'center',
              borderRadius: 2.5,
              border: `1px solid ${alpha(brandColors.white, 0.18)}`,
              bgcolor: alpha(brandColors.white, 0.1),
              color: brandColors.white,
            }}
          >
            <FactCheckRoundedIcon sx={{ fontSize: 30 }} />
          </Box>
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.78)',
              fontSize: '0.7rem',
              fontWeight: 750,
              letterSpacing: 1.5,
            }}
          >
            REPORTING DESK
          </Typography>
        </Stack>
        <Box sx={{ position: 'relative', zIndex: 1, mt: 5 }}>
          <Typography
            variant="overline"
            sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 750, letterSpacing: 1.5 }}
          >
            First edition in development
          </Typography>
          <Typography
            variant="h3"
            sx={{ mt: 1, fontSize: { xs: '2rem', md: '2.5rem' }, color: brandColors.white }}
          >
            Our reports will show the work, not just describe it.
          </Typography>
        </Box>
      </Grid>

      <Grid
        size={{ xs: 12, md: 7 }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          p: { xs: 3.5, md: 5.5 },
          color: 'text.primary',
        }}
      >
        <Typography variant="h5" sx={{ color: 'inherit' }}>
          Reports coming soon
        </Typography>
        <Typography sx={{ maxWidth: 610, mt: 1.5, color: 'text.secondary', lineHeight: 1.8 }}>
          We are building an evidence base that documents what we promised, what we delivered, what
          changed, and what we learned along the way.
        </Typography>

        <Typography
          variant="overline"
          sx={{ mt: 4, color: 'text.primary', fontWeight: 750, letterSpacing: 1.4 }}
        >
          What each report will cover
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {REPORT_PROMISES.map((promise) => (
            <Stack key={promise} direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  display: 'grid',
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  placeItems: 'center',
                  borderRadius: '50%',
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                }}
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 17 }} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                {promise}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Grid>
    </Grid>
  </Box>
);

export const ReportsSection = (): JSX.Element => {
  const { data, isLoading } = useReports();
  const reports = data?.items ?? [];

  const renderReports = (): JSX.Element => {
    if (isLoading) {
      return <ReportsSkeleton />;
    }
    if (reports.length === 0) {
      return <ReportsEmptyState />;
    }
    return (
      <Grid container spacing={2.5}>
        {reports.map((report, index) => (
          <Grid key={report.id} size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: 'flex' }}>
            <SectionReveal delay={index * 0.06} fillHeight>
              <ReportCard report={report} index={index} />
            </SectionReveal>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box
      component="section"
      aria-labelledby="reports-section-title"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default',
        color: 'text.primary',
        py: { xs: 8, md: 12 },
      }}
    >
      <Watermark
        variant="contours"
        position="top-left"
        size={{ xs: 260, md: 420 }}
        opacity={0.05}
        sx={{ color: 'primary.main' }}
      />
      <Container sx={{ position: 'relative', zIndex: 1 }}>
        <Grid
          container
          spacing={{ xs: 3, md: 6 }}
          sx={{
            alignItems: 'flex-end',
            mb: { xs: 5, md: 7 },
          }}
        >
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box sx={{ width: 38, height: 2, borderRadius: 99, bgcolor: 'secondary.main' }} />
              <Typography
                variant="overline"
                sx={{ color: 'text.primary', fontWeight: 750, letterSpacing: 1.8 }}
              >
                Accountability &amp; Transparency
              </Typography>
            </Stack>
            <Typography
              id="reports-section-title"
              variant="h2"
              sx={{ mt: 1.5, fontSize: { xs: '2.1rem', md: '3.2rem' }, color: 'text.primary' }}
            >
              Reports &amp; Resources
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography
              sx={{ maxWidth: 440, ml: { md: 'auto' }, color: 'text.secondary', lineHeight: 1.75 }}
            >
              Clear evidence, honest learning, and accessible records of how the Alliance turns
              commitments into results.
            </Typography>
          </Grid>
        </Grid>
        {renderReports()}
      </Container>
    </Box>
  );
};

const Impact = (): JSX.Element => {
  const impactBanner = useSiteImage('impact-banner');
  const copy = usePageCopy('impact', {
    seoTitle: 'Our Impact — Transforming Lives Across West Africa',
    seoDescription:
      "How Impact Africa Alliance contributes to the UN Sustainable Development Goals and the African Union's Agenda 2063.",
    heroEyebrow: 'Our Reach',
    heroTitle: 'Our Impact',
    heroSubtitle: 'Numbers tell part of the story. People tell the rest.',
  });
  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <PageHero
        eyebrow={copy.heroEyebrow}
        title={copy.heroTitle}
        subtitle={copy.heroSubtitle}
        image={copy.heroImageUrl ?? impactBanner}
      />
      <ImpactNumbersSection />
      <ProgrammeGallery />
      <SdgSection />
      <AgendaSection />
      <VoicesBand />
      <ReportsSection />
      <PageCta copy={copy} />
    </>
  );
};

export default Impact;
