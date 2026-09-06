import { brandColors } from '@iaa/shared';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EastIcon from '@mui/icons-material/East';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Navigate, Link as RouterLink, useParams } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { programIcon } from '../content/icons';
import { PROGRAMS, findProgram } from '../content/programs';
import { usePillarImage } from '../lib/site-images';

const OtherInitiatives = ({ currentSlug }: { currentSlug: string }): JSX.Element => {
  const pillarImage = usePillarImage();
  return (
    <Section eyebrow="Keep Exploring" title="Other Initiatives" bgcolor="background.default">
      <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
        {PROGRAMS.filter((program) => program.slug !== currentSlug).map((program) => {
          const Icon = programIcon(program.slug);
          return (
            <Grid key={program.slug} size={{ xs: 12, sm: 4 }} sx={{ display: 'flex' }}>
              <Card
                sx={{
                  width: '100%',
                  borderRadius: 3,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow .25s, transform .25s',
                  '&:hover': { boxShadow: 6, transform: 'translateY(-4px)' },
                  '&:hover .oi-img': { transform: 'scale(1.06)' },
                }}
              >
                <CardActionArea
                  component={RouterLink}
                  to={`/our-work/${program.slug}`}
                  sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <Box
                    sx={{ position: 'relative', height: 150, overflow: 'hidden', flexShrink: 0 }}
                  >
                    <Box
                      className="oi-img"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${pillarImage(program.slug)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'transform .4s ease',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 14,
                        left: 14,
                        width: 42,
                        height: 42,
                        borderRadius: 1.5,
                        bgcolor: 'secondary.main',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: 3,
                      }}
                    >
                      <Icon sx={{ color: 'common.white', fontSize: 23 }} />
                    </Box>
                  </Box>
                  <CardContent
                    sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}
                  >
                    <Typography variant="overline" color="success.main" sx={{ fontWeight: 700 }}>
                      {program.initiative}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.35, flexGrow: 1 }}>
                      {program.title}
                    </Typography>
                    <Box
                      sx={{
                        mt: 2,
                        color: 'text.primary',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      Explore <EastIcon fontSize="small" />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Section>
  );
};

const InitiativePage = (): JSX.Element => {
  const pillarImage = usePillarImage();
  const { slug = '' } = useParams();
  const program = findProgram(slug);

  if (!program) {
    return <Navigate to="/our-work" replace />;
  }

  return (
    <>
      <Seo title={program.title} description={program.descriptor} />
      <PageHero
        eyebrow={program.initiative}
        title={program.title}
        subtitle={program.descriptor}
        image={pillarImage(program.slug)}
      />

      <Section eyebrow="The Challenge" title="Why this initiative exists">
        <Typography
          sx={{ maxWidth: 840, fontSize: '1.1rem', lineHeight: 1.8, color: 'text.secondary' }}
        >
          {program.challenge}
        </Typography>
      </Section>

      <Section eyebrow="Our Approach" title="What We Do" bgcolor="background.default">
        <Grid container spacing={3}>
          {program.whatWeDo.map((item) => (
            <Grid key={item} size={{ xs: 12, md: 6 }}>
              <SectionReveal>
                <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: 2.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'rgba(46,125,79,0.12)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircleRoundedIcon color="success" sx={{ fontSize: 22 }} />
                    </Box>
                    <Typography sx={{ pt: 0.75 }}>{item}</Typography>
                  </CardContent>
                </Card>
              </SectionReveal>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: { xs: 7, md: 10 } }}>
        <Container>
          <Typography
            variant="overline"
            sx={{ color: 'primary.contrastText', fontWeight: 700, letterSpacing: 2 }}
          >
            Our Goal
          </Typography>
          <Typography variant="h5" sx={{ mt: 1, maxWidth: 880, fontWeight: 600, lineHeight: 1.5 }}>
            {program.goal}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
            <Button
              component={RouterLink}
              to="/get-involved#donate"
              variant="contained"
              color="secondary"
              size="large"
              sx={{ fontWeight: 700 }}
            >
              Support This Initiative
            </Button>
            <Button
              component={RouterLink}
              to="/get-involved"
              variant="outlined"
              size="large"
              endIcon={<EastIcon />}
              sx={{
                color: 'primary.contrastText',
                borderColor: alpha(brandColors.deepForest, 0.6),
              }}
            >
              Get Involved
            </Button>
          </Stack>
        </Container>
      </Box>

      <OtherInitiatives currentSlug={program.slug} />
    </>
  );
};

export default InitiativePage;
