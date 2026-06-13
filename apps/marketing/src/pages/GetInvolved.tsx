import { ORG, type Job } from '@iaa/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
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
import { DonateForm } from '../features/donate/DonateForm';
import { PartnerForm } from '../features/forms/PartnerForm';
import { VolunteerForm } from '../features/forms/VolunteerForm';
import { useJobs } from '../lib/content-hooks';

const TABS = ['partner', 'volunteer', 'donate', 'careers'] as const;
type TabKey = (typeof TABS)[number];

const isTabKey = (value: string): value is TabKey => (TABS as readonly string[]).includes(value);

const JobRow = ({ job }: { job: Job }): JSX.Element => (
  <Card variant="outlined">
    <CardContent>
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
        title="Get Involved"
        subtitle="There are many ways to be part of Africa's transformation. Find yours."
      />

      <Section>
        <Tabs
          value={tab}
          onChange={(_event, value: TabKey) => {
            setTab(value);
            window.history.replaceState(null, '', `#${value}`);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="partner" label="Partner With Us" />
          <Tab value="volunteer" label="Volunteer / Mentor" />
          <Tab value="donate" label="Donate" />
          <Tab value="careers" label="Careers" />
        </Tabs>

        <Box hidden={tab !== 'partner'}>
          <Typography variant="h5" gutterBottom>
            Ready to Partner? Tell Us About Your Organization.
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
            IAA actively seeks partnerships with organizations, businesses, institutions, and
            governments that share our commitment to sustainable African development.
          </Typography>
          {tab === 'partner' && <PartnerForm />}
        </Box>

        <Box hidden={tab !== 'volunteer'}>
          <Typography variant="h5" gutterBottom>
            Join Our Volunteer &amp; Mentor Network
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
            Are you a professional or passionate individual who wants to give back to Africa&apos;s
            next generation? We connect volunteers and mentors with youth and women across our
            programs.
          </Typography>
          {tab === 'volunteer' && <VolunteerForm />}
        </Box>

        <Box hidden={tab !== 'donate'}>
          <Typography variant="h5" gutterBottom>
            Make a Difference Today
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
            Every contribution to IAA directly funds programs that change lives. You will know
            exactly where your money goes.
          </Typography>
          {tab === 'donate' && <DonateForm />}
        </Box>

        <Box hidden={tab !== 'careers'}>
          <Typography variant="h5" gutterBottom>
            Work With IAA
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 760 }}>
            Do you want to build a career in African development? IAA offers career opportunities,
            internships, and fellowships for passionate individuals.
          </Typography>
          {tab === 'careers' && <CareersTab />}
        </Box>
      </Section>
    </>
  );
};

export default GetInvolved;
