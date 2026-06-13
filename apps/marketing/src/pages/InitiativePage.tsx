import { brandColors } from '@iaa/shared';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Navigate, Link as RouterLink, useParams } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { findProgram } from '../content/programs';

const InitiativePage = (): JSX.Element => {
  const { slug = '' } = useParams();
  const program = findProgram(slug);

  if (!program) {
    return <Navigate to="/our-work" replace />;
  }

  return (
    <>
      <Seo title={program.title} description={program.descriptor} />
      <PageHero title={program.title} subtitle={program.descriptor} />

      <Section eyebrow={program.initiative} title="The Challenge">
        <Typography sx={{ maxWidth: 820 }} color="text.secondary">
          {program.challenge}
        </Typography>
      </Section>

      <Section title="What We Do" bgcolor={brandColors.offWhite}>
        <Grid container spacing={2}>
          {program.whatWeDo.map((item) => (
            <Grid key={item} size={{ xs: 12, md: 6 }}>
              <List disablePadding>
                <ListItem alignItems="flex-start" disableGutters>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary={item} />
                </ListItem>
              </List>
            </Grid>
          ))}
        </Grid>
      </Section>

      <Box sx={{ bgcolor: 'primary.main', color: 'common.white', py: { xs: 6, md: 9 } }}>
        <Section>
          <Typography variant="h4">Our Goal</Typography>
          <Typography sx={{ mt: 2, maxWidth: 820, opacity: 0.95 }}>{program.goal}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
            <Button
              component={RouterLink}
              to="/get-involved#donate"
              variant="contained"
              color="secondary"
            >
              Support This Initiative
            </Button>
            <Button
              component={RouterLink}
              to="/get-involved"
              variant="outlined"
              sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)' }}
            >
              Get Involved
            </Button>
          </Stack>
        </Section>
      </Box>
    </>
  );
};

export default InitiativePage;
