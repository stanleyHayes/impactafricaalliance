import { SDG_GOALS, brandColors } from '@iaa/shared';
import DownloadIcon from '@mui/icons-material/Download';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { CardGridSkeleton } from '../components/skeletons';
import { useReports } from '../lib/content-hooks';

const ASPIRATIONS = [
  'Aspiration 1 — A prosperous Africa, based on inclusive growth and sustainable development',
  'Aspiration 2 — An integrated continent, politically united on the ideals of Pan-Africanism',
  'Aspiration 6 — An Africa whose development is people-driven, relying on the potential of its people',
];

const ReportsSection = (): JSX.Element => {
  const { data, isLoading } = useReports();
  const reports = data?.items ?? [];

  const renderReports = (): JSX.Element => {
    if (isLoading) {
      return <CardGridSkeleton count={3} />;
    }
    if (reports.length === 0) {
      return (
        <Typography color="text.secondary">
          Our first impact reports are being prepared and will be published here. We believe in
          radical transparency — documenting what we promised, delivered, and learned.
        </Typography>
      );
    }
    return (
      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid key={report.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="success.main">
                  {report.year}
                </Typography>
                <Typography variant="h6">{report.title}</Typography>
                {report.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {report.description}
                  </Typography>
                )}
                <Button
                  href={report.file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<DownloadIcon />}
                  sx={{ mt: 2, px: 0 }}
                >
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Section eyebrow="Accountability & Transparency" title="Reports & Resources">
      {renderReports()}
    </Section>
  );
};

const Impact = (): JSX.Element => (
  <>
    <Seo
      title="Our Impact — Transforming Lives Across West Africa"
      description="How Impact Africa Alliance contributes to the UN Sustainable Development Goals and the African Union's Agenda 2063."
    />
    <PageHero title="Our Impact" subtitle="Numbers tell part of the story. People tell the rest." />

    <Section eyebrow="Our Contribution to Global Goals" title="UN Sustainable Development Goals">
      <Grid container spacing={2}>
        {SDG_GOALS.map((goal) => (
          <Grid key={goal.number} size={{ xs: 12, sm: 6, md: 4 }}>
            <SectionReveal>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1,
                        bgcolor: 'primary.main',
                        color: 'common.white',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 800,
                      }}
                    >
                      {goal.number}
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>{goal.title}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {goal.contribution}
                  </Typography>
                </CardContent>
              </Card>
            </SectionReveal>
          </Grid>
        ))}
      </Grid>
    </Section>

    <Section
      eyebrow="Building the Africa We Want"
      title="Agenda 2063 Alignment"
      bgcolor={brandColors.offWhite}
    >
      <Stack spacing={2}>
        {ASPIRATIONS.map((aspiration) => (
          <Typography key={aspiration} sx={{ borderLeft: 3, borderColor: 'secondary.main', pl: 2 }}>
            {aspiration}
          </Typography>
        ))}
      </Stack>
    </Section>

    <ReportsSection />
  </>
);

export default Impact;
