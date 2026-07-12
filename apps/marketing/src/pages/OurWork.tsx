import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EastIcon from '@mui/icons-material/East';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { programIcon } from '../content/icons';
import { IMAGES, programImage } from '../content/images';
import { PROGRAMS, type ProgramContent } from '../content/programs';
import { useHeroImage } from '../lib/content-hooks';

const ProgramFeature = ({ program, index }: { program: ProgramContent; index: number }): JSX.Element => {
  const Icon = programIcon(program.slug);
  const reversed = index % 2 === 1;
  return (
    <SectionReveal>
      <Grid container spacing={{ xs: 3, md: 6 }} sx={{ alignItems: 'center', flexDirection: { xs: 'column', md: reversed ? 'row-reverse' : 'row' } }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ position: 'relative', borderRadius: 4, overflow: 'hidden', boxShadow: '0 24px 50px -24px rgba(16,40,30,0.5)' }}>
            <Box
              component="img"
              src={programImage(program.slug)}
              alt={program.title}
              sx={{ width: '100%', display: 'block', aspectRatio: '16 / 10', objectFit: 'cover' }}
            />
            <Box sx={{ position: 'absolute', top: 18, left: 18, width: 52, height: 52, borderRadius: 2, bgcolor: 'secondary.main', display: 'grid', placeItems: 'center', boxShadow: 3 }}>
              <Icon sx={{ color: 'common.white', fontSize: 28 }} />
            </Box>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="overline" color="success.main" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
            {program.initiative}
          </Typography>
          <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800 }}>
            {program.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2, fontSize: '1.05rem' }}>
            {program.descriptor}
          </Typography>
          <Stack spacing={1.25} sx={{ mt: 3 }}>
            {program.whatWeDo.slice(0, 3).map((item) => (
              <Stack key={item} direction="row" spacing={1.25} alignItems="flex-start">
                <CheckCircleRoundedIcon color="success" sx={{ fontSize: 20, mt: 0.2 }} />
                <Typography variant="body2">{item}</Typography>
              </Stack>
            ))}
          </Stack>
          <Button
            component={RouterLink}
            to={`/our-work/${program.slug}`}
            variant="contained"
            endIcon={<EastIcon />}
            sx={{ mt: 3.5, fontWeight: 700 }}
          >
            Explore initiative
          </Button>
        </Grid>
      </Grid>
    </SectionReveal>
  );
};

const OurWork = (): JSX.Element => {
  const heroImage = useHeroImage('our-work', IMAGES.programs['digital-skills']);
  return (
    <>
      <Seo
        title="Our Programs — Digital Skills, STEM, Climate, Women Empowerment"
        description="Four flagship initiatives forming an integrated ecosystem of change across Africa."
      />
      <PageHero
        eyebrow="What We Do"
        title="Our Work"
        subtitle="Four flagship initiatives. One transformative mission."
        image={heroImage}
      />
    <Section
      subtitle="IAA's work is organized around four interconnected pillars — each addressing a critical gap in Africa's development landscape. Together, they form an integrated ecosystem of change."
      watermark="africa"
      watermarkPosition="center"
    >
      <Stack spacing={{ xs: 8, md: 12 }}>
        {PROGRAMS.map((program, index) => (
          <ProgramFeature key={program.slug} program={program} index={index} />
        ))}
      </Stack>
    </Section>
  </>
  );
};

export default OurWork;
