import { ORG, brandColors, brandFonts, type Job } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { MintSurface } from '../components/MintSurface';
import { PageCta } from '../components/PageCta';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { Seo } from '../components/Seo';
import { CardGridSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { DonateForm } from '../features/donate/DonateForm';
import { PartnerForm } from '../features/forms/PartnerForm';
import { VolunteerForm } from '../features/forms/VolunteerForm';
import { useJobs, usePageCopy } from '../lib/content-hooks';

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

interface PillTabsProps {
  value: TabKey;
  onChange: (value: TabKey) => void;
  options: { value: TabKey; label: string; icon: SvgIconComponent }[];
}

const PillTabs = ({ value, onChange, options }: PillTabsProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const measure = (): void => {
      const container = containerRef.current;
      const selectedIndex = options.findIndex((option) => option.value === value);
      const selected = tabRefs.current[selectedIndex];
      if (!container || !selected) {
        setPillStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      setPillStyle({
        opacity: 1,
        width: selectedRect.width,
        height: selectedRect.height,
        top: selectedRect.top - containerRect.top,
        transform: `translateX(${selectedRect.left - containerRect.left + container.scrollLeft}px)`,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [value, options]);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Box
        ref={containerRef}
        role="tablist"
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          overflowX: 'auto',
          p: 1.25,
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            borderRadius: 999,
            bgcolor: 'primary.main',
            boxShadow: '0 2px 8px rgba(0,214,139,0.35)',
            pointerEvents: 'none',
            transition:
              'transform 360ms cubic-bezier(0.22, 1, 0.36, 1), width 360ms cubic-bezier(0.22, 1, 0.36, 1), height 200ms ease, opacity 200ms ease',
            ...pillStyle,
          }}
        />
        {options.map((option, index) => {
          const Icon = option.icon;
          const selected = option.value === value;
          return (
            <ButtonBase
              key={option.value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              sx={{
                position: 'relative',
                zIndex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                minHeight: 48,
                px: { xs: 2, md: 2.5 },
                py: 1,
                borderRadius: 999,
                color: selected ? 'primary.contrastText' : 'text.secondary',
                fontFamily: brandFonts.body,
                fontSize: '0.9rem',
                fontWeight: selected ? 700 : 600,
                whiteSpace: 'nowrap',
                transition: 'color 150ms ease',
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
              {option.label}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
};

const JobRow = ({ job }: { job: Job }): JSX.Element => (
  <Card
    variant="outlined"
    sx={{
      borderColor: 'rgba(0,30,20,0.14)',
      transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
      '&:hover': {
        borderColor: 'rgba(0,30,20,0.34)',
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
          component={RouterLink}
          to={`/get-involved/careers/${job.slug}/apply`}
          variant="contained"
          sx={{
            width: { xs: '100%', sm: 'auto' },
            alignSelf: { xs: 'stretch', sm: 'center' },
            py: { xs: 1.25, sm: 1 },
          }}
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
        <Link
          href={`mailto:${ORG.careersEmail}`}
          color="secondary.main"
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          {ORG.careersEmail}
        </Link>{' '}
        and we will be in touch when a suitable opportunity arises.
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

  const copy = usePageCopy('get-involved', {
    seoTitle: 'Get Involved — Partner, Volunteer, or Donate',
    seoDescription: "There are many ways to be part of Africa's transformation. Partner with us, volunteer, donate, or join our team.",
    heroEyebrow: 'Take Action',
    heroTitle: 'Get Involved',
    heroSubtitle: "There are many ways to be part of Africa's transformation. Find yours.",
  });

  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <PageHero
        eyebrow={copy.heroEyebrow}
        title={copy.heroTitle}
        subtitle={copy.heroSubtitle}
        image={copy.heroImageUrl ?? IMAGES.programs['youth-inclusion']}
        watermark="africa"
      />

      <Section bgcolor="background.default" watermark="africa" watermarkPosition="bottom-right">
        <Paper
          sx={{
            overflow: 'hidden',
            border: 1,
            borderColor: 'rgba(0,30,20,0.12)',
            borderRadius: 4,
            bgcolor: 'background.paper',
            boxShadow: '0 28px 70px -58px rgba(18,66,42,0.85)',
          }}
        >
          <PillTabs
            value={tab}
            onChange={(value) => {
              setTab(value);
              window.history.replaceState(null, '', `#${value}`);
            }}
            options={TABS.map((key) => ({
              value: key,
              label: TAB_DETAILS[key].label,
              icon: TAB_DETAILS[key].icon,
            }))}
          />

          <MintSurface
            sx={{
              position: 'relative',
              overflow: 'hidden',
              px: { xs: 3, sm: 4, md: 5 },
              py: { xs: 4, md: 5 },
              '&::after': {
                position: 'absolute',
                right: -90,
                bottom: -170,
                width: 300,
                height: 300,
                border: `1px solid ${alpha(brandColors.gold, 0.18)}`,
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
                      sx={{ color: 'rgba(14,42,34,0.58)', fontWeight: 750, letterSpacing: 1.6 }}
                    >
                      {details.eyebrow}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        mt: 0.5,
                        fontSize: { xs: '1.75rem', md: '2.3rem' },
                      }}
                    >
                      {details.title}
                    </Typography>
                    <Typography
                      sx={{
                        maxWidth: 800,
                        mt: 1.25,
                        color: 'rgba(14,42,34,0.72)',
                        lineHeight: 1.7,
                      }}
                    >
                      {details.description}
                    </Typography>
                  </Box>
                </Stack>
              );
            })()}
          </MintSurface>

          <Box sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
            <Box hidden={tab !== 'partner'}>{tab === 'partner' && <PartnerForm />}</Box>
            <Box hidden={tab !== 'volunteer'}>{tab === 'volunteer' && <VolunteerForm />}</Box>
            <Box hidden={tab !== 'donate'}>{tab === 'donate' && <DonateForm />}</Box>
            <Box hidden={tab !== 'careers'}>{tab === 'careers' && <CareersTab />}</Box>
          </Box>
        </Paper>
      </Section>
      <PageCta copy={copy} />
    </>
  );
};

export default GetInvolved;
