import { ORG, type Job } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { CardGridSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { DonateForm } from '../features/donate/DonateForm';
import { PartnerForm } from '../features/forms/PartnerForm';
import { VolunteerForm } from '../features/forms/VolunteerForm';
import { useJobs } from '../lib/content-hooks';

const TABS = ['partner', 'volunteer', 'donate', 'careers'] as const;
type TabKey = (typeof TABS)[number];

const TAB_DETAILS: Record<
  TabKey,
  { label: string; eyebrow: string; title: string; description: string; icon: SvgIconComponent }
> = {
  partner: {
    label: 'Partner With Us',
    eyebrow: 'Build together',
    title: 'Turn shared ambition into lasting impact.',
    description:
      'We work with organisations, businesses, institutions, and governments committed to sustainable African development.',
    icon: HandshakeRoundedIcon,
  },
  volunteer: {
    label: 'Volunteer / Mentor',
    eyebrow: 'Share your experience',
    title: 'Put your skills where they can open doors.',
    description:
      'Join a network of professionals helping youth and women gain practical knowledge, confidence, and opportunity.',
    icon: VolunteerActivismRoundedIcon,
  },
  donate: {
    label: 'Donate',
    eyebrow: 'Fund direct impact',
    title: 'Help promising ideas reach more people.',
    description:
      'Every contribution supports practical programmes, community delivery, and transparent outcomes across our network.',
    icon: FavoriteRoundedIcon,
  },
  careers: {
    label: 'Careers',
    eyebrow: 'Grow with the Alliance',
    title: 'Build a career around meaningful work.',
    description:
      'Explore roles, internships, and fellowships for people ready to help shape inclusive development across Africa.',
    icon: BusinessCenterRoundedIcon,
  },
};

const isTabKey = (value: string): value is TabKey => (TABS as readonly string[]).includes(value);

const JobRow = ({ job }: { job: Job }): JSX.Element => (
  <Card
    variant="outlined"
    sx={{
      borderColor: 'rgba(26,92,56,0.14)',
      transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
      '&:hover': {
        borderColor: 'rgba(26,92,56,0.34)',
        boxShadow: '0 18px 38px -30px rgba(18,66,42,0.7)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h6">{job.title}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip size="small" label={job.location} />
            <Chip size="small" color="primary" label={job.type} />
          </Stack>
        </Box>
        <Button
          variant="contained"
          href={job.applyUrl ?? `mailto:${ORG.careersEmail}`}
          target={job.applyUrl ? '_blank' : undefined}
          rel={job.applyUrl ? 'noopener noreferrer' : undefined}
          sx={{ alignSelf: 'center' }}
        >
          Apply
        </Button>
      </Stack>
    </CardContent>
  </Card>
);

const CareersTab = (): JSX.Element => {
  const { data, isLoading } = useJobs();
  const jobs = data?.items ?? [];
  if (isLoading) {
    return <CardGridSkeleton count={3} columns={1} />;
  }
  if (jobs.length === 0) {
    return (
      <Typography color="text.secondary">
        No open positions at this time. We are always keen to connect with talented individuals —
        send your CV and a brief motivation letter to{' '}
        <a href={`mailto:${ORG.careersEmail}`}>{ORG.careersEmail}</a> and we will be in touch when a
        suitable opportunity arises.
      </Typography>
    );
  }
  return (
    <Stack spacing={2}>
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} />
      ))}
    </Stack>
  );
};

const GetInvolved = (): JSX.Element => {
  const { hash } = useLocation();
  const [tab, setTab] = useState<TabKey>('partner');

  useEffect(() => {
    const key = hash.replace('#', '');
    if (isTabKey(key)) {
      setTab(key);
    }
  }, [hash]);

  return (
    <>
      <Seo
        title="Get Involved — Partner, Volunteer, or Donate"
        description="There are many ways to be part of Africa's transformation. Partner with us, volunteer, donate, or join our team."
      />
      <PageHero
        eyebrow="Take Action"
        title="Get Involved"
        subtitle="There are many ways to be part of Africa's transformation. Find yours."
        image={IMAGES.programs['climate-action']}
      />

      <Section bgcolor="#F1F5EF">
        <Paper
          sx={{
            overflow: 'hidden',
            border: 1,
            borderColor: 'rgba(26,92,56,0.12)',
            borderRadius: 4,
            bgcolor: 'background.paper',
            boxShadow: '0 28px 70px -58px rgba(18,66,42,0.85)',
          }}
        >
          <Box sx={{ overflowX: 'auto', borderBottom: 1, borderColor: 'divider', p: 1.25 }}>
            <Tabs
              value={tab}
              onChange={(_event, value: TabKey) => {
                setTab(value);
                window.history.replaceState(null, '', `#${value}`);
              }}
              variant="scrollable"
              scrollButtons="auto"
              TabIndicatorProps={{ style: { display: 'none' } }}
              sx={{
                minHeight: 52,
                '& .MuiTabs-flexContainer': { gap: 0.75 },
                '& .MuiTab-root': {
                  minHeight: 52,
                  px: { xs: 2, md: 2.5 },
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'common.white',
                    boxShadow: '0 10px 24px -16px rgba(18,66,42,0.8)',
                  },
                },
              }}
            >
              {TABS.map((key) => {
                const details = TAB_DETAILS[key];
                const Icon = details.icon;
                return (
                  <Tab
                    key={key}
                    value={key}
                    label={details.label}
                    icon={<Icon sx={{ fontSize: 20 }} />}
                    iconPosition="start"
                  />
                );
              })}
            </Tabs>
          </Box>

          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              px: { xs: 3, sm: 4, md: 5 },
              py: { xs: 4, md: 5 },
              bgcolor: 'primary.dark',
              color: 'common.white',
              '&::after': {
                position: 'absolute',
                right: -90,
                bottom: -170,
                width: 300,
                height: 300,
                border: '1px solid rgba(212,160,23,0.18)',
                borderRadius: '50%',
                content: '""',
              },
            }}
          >
            {(() => {
              const details = TAB_DETAILS[tab];
              const Icon = details.icon;
              return (
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2.5}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  sx={{ position: 'relative', zIndex: 1 }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      width: 58,
                      height: 58,
                      flexShrink: 0,
                      placeItems: 'center',
                      borderRadius: 2.5,
                      bgcolor: 'secondary.main',
                      color: 'secondary.contrastText',
                    }}
                  >
                    <Icon sx={{ fontSize: 30 }} />
                  </Box>
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{ color: 'secondary.light', fontWeight: 750, letterSpacing: 1.6 }}
                    >
                      {details.eyebrow}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        mt: 0.5,
                        color: 'common.white',
                        fontSize: { xs: '1.75rem', md: '2.3rem' },
                      }}
                    >
                      {details.title}
                    </Typography>
                    <Typography
                      sx={{
                        maxWidth: 800,
                        mt: 1.25,
                        color: 'rgba(255,255,255,0.72)',
                        lineHeight: 1.7,
                      }}
                    >
                      {details.description}
                    </Typography>
                  </Box>
                </Stack>
              );
            })()}
          </Box>

          <Box sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
            <Box hidden={tab !== 'partner'}>{tab === 'partner' && <PartnerForm />}</Box>
            <Box hidden={tab !== 'volunteer'}>{tab === 'volunteer' && <VolunteerForm />}</Box>
            <Box hidden={tab !== 'donate'}>{tab === 'donate' && <DonateForm />}</Box>
            <Box hidden={tab !== 'careers'}>{tab === 'careers' && <CareersTab />}</Box>
          </Box>
        </Paper>
      </Section>
    </>
  );
};

export default GetInvolved;
