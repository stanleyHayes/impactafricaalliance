import EastIcon from '@mui/icons-material/East';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { PROGRAMS } from '../content/programs';

const OurWork = (): JSX.Element => (
  <>
    <Seo
      title="Our Programs — Digital Skills, STEM, Climate, Women Empowerment"
      description="Four flagship initiatives forming an integrated ecosystem of change across Africa."
    />
    <PageHero title="Our Work" subtitle="Four flagship initiatives. One transformative mission." />
    <Section subtitle="IAA's work is organized around four interconnected pillars — each addressing a critical gap in Africa's development landscape. Together, they form an integrated ecosystem of change.">
      <Grid container spacing={3}>
        {PROGRAMS.map((program) => (
          <Grid key={program.slug} size={{ xs: 12, md: 6 }}>
            <SectionReveal>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardActionArea
                  component={RouterLink}
                  to={`/our-work/${program.slug}`}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography sx={{ fontSize: 44 }} aria-hidden>
                      {program.emoji}
                    </Typography>
                    <Typography variant="overline" color="success.main">
                      {program.initiative}
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>
                      {program.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      {program.descriptor}
                    </Typography>
                    <Button endIcon={<EastIcon />} sx={{ mt: 2, px: 0 }}>
                      Explore initiative
                    </Button>
                  </CardContent>
                </CardActionArea>
              </Card>
            </SectionReveal>
          </Grid>
        ))}
      </Grid>
    </Section>
  </>
);

export default OurWork;
