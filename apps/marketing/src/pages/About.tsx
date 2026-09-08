import {
  SDG_GOALS,
  TEAM_TIERS,
  TEAM_TIER_LABELS,
  brandColors,
  brandFonts,
  type TeamMember,
  type TeamTier,
} from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import EastIcon from '@mui/icons-material/East';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import RecyclingRoundedIcon from '@mui/icons-material/RecyclingRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { AllianceSculpture } from '../components/AllianceSculpture';
import { ImpactMetrics } from '../components/ImpactMetrics';
import { PageCta } from '../components/PageCta';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { CardGridSkeleton, PartnerLogosSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { usePageCopy, usePartners, useTeam } from '../lib/content-hooks';
import { useSiteImage } from '../lib/site-images';

const DISCIPLINES: ReadonlyArray<{ label: string; icon: SvgIconComponent }> = [
  { label: 'Technology', icon: CodeRoundedIcon },
  { label: 'Development', icon: PublicRoundedIcon },
  { label: 'Finance', icon: AccountBalanceRoundedIcon },
  { label: 'Communications', icon: CampaignRoundedIcon },
  { label: 'Advocacy', icon: VolunteerActivismRoundedIcon },
];

const VALUES: ReadonlyArray<{ icon: SvgIconComponent; name: string; text: string }> = [
  {
    icon: HandshakeRoundedIcon,
    name: 'Inclusivity',
    text: 'Ensuring every African, regardless of background, gender, or ability, has access to opportunities for growth and success.',
  },
  {
    icon: LightbulbRoundedIcon,
    name: 'Innovation',
    text: "Leveraging technology and creative problem-solving to address Africa's pressing challenges with bold, scalable solutions.",
  },
  {
    icon: HubRoundedIcon,
    name: 'Collaboration',
    text: 'Partnering with local and global stakeholders so collective effort becomes measurable community progress.',
  },
  {
    icon: RecyclingRoundedIcon,
    name: 'Sustainability',
    text: 'Designing programs that create long-term change embedded in the communities we serve.',
  },
  {
    icon: VerifiedRoundedIcon,
    name: 'Integrity',
    text: 'Upholding transparency, accountability, and ethical conduct in every initiative we undertake.',
  },
];

const DIRECTION_CARDS = [
  {
    eyebrow: 'Our Vision',
    title: 'An inclusive, empowered, and sustainable Africa.',
    text: 'A continent where every individual has the opportunity to reach their full potential and contribute meaningfully to society.',
    icon: VisibilityRoundedIcon,
    dark: true,
  },
  {
    eyebrow: 'Our Mission',
    title: 'Turn local leadership into sustainable impact.',
    text: 'We foster innovation, skills development, economic empowerment, and social inclusion through collaborative initiatives.',
    icon: TrackChangesRoundedIcon,
    dark: false,
  },
] as const;

interface Milestone {
  readonly year: string;
  readonly title: string;
  readonly text: string;
  /** Optional attribution shown beneath the milestone copy. */
  readonly linkUrl?: string;
  readonly linkLabel?: string;
}

const MILESTONES: readonly Milestone[] = [
  {
    year: '2024',
    title: 'The Idea Takes Shape',
    text: 'Young African leaders come together with one conviction: the continent’s transformation must be led by Africans, for Africans.',
    linkUrl: 'https://www.ali-wa.net/',
    linkLabel: 'Powered by the ALIWA Youth Leadership Program',
  },
  {
    year: '2025',
    title: 'Building the Foundation',
    text: 'IAA develops its brand identity, organizational structure, flagship programs, and partnerships across Ghana, Sierra Leone, and Nigeria.',
  },
  {
    year: '2026',
    title: 'Going Live',
    text: 'IAA launches its digital presence and prepares the first cohort of programs for communities, youth, and women.',
  },
  {
    year: '2027+',
    title: 'Scaling Across West Africa',
    text: 'The roadmap expands across West Africa, toward a digital learning platform and a Pan-African Youth Leadership Network.',
  },
];

const STRUCTURE_LEVELS = [
  {
    title: 'President / CEO',
    text: 'Strategic leadership, governance, partnerships, and continental direction.',
  },
  {
    title: 'Functional Directors',
    text: 'Programs, operations, finance, communications, technology, and monitoring.',
  },
  {
    title: 'Country & Regional Teams',
    text: 'Local delivery teams adapting programs to community realities.',
  },
  {
    title: 'Volunteers, Mentors & Fellows',
    text: 'The alliance network that brings skills, coaching, and energy to the field.',
  },
] as const;

export const AboutIntro = (): JSX.Element => {
  const introImage = useSiteImage('about-intro');
  return (
    <Section bgcolor="background.default">
      <Grid container spacing={{ xs: 4, md: 6 }} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <SectionReveal fillHeight>
            <Box
              sx={{
                display: 'flex',
                height: '100%',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box sx={{ width: 36, height: 2, bgcolor: 'secondary.main' }} />
                <Typography
                  variant="overline"
                  sx={{ color: 'text.primary', fontWeight: 750, letterSpacing: 1.8 }}
                >
                  Who We Are
                </Typography>
              </Stack>
              <Typography
                variant="h2"
                sx={{
                  mt: 2,
                  maxWidth: 680,
                  fontSize: { xs: '2rem', md: '3rem' },
                  lineHeight: 1.08,
                }}
              >
                Architects of Africa&apos;s transformation, not observers of it.
              </Typography>
              <Typography sx={{ mt: 2.5, maxWidth: 680, color: 'text.secondary', lineHeight: 1.8 }}>
                Impact Africa Alliance is a purpose-driven, Pan-African organization committed to
                sustainable development and transformative change across Africa.
              </Typography>
              <Typography sx={{ mt: 2, maxWidth: 700, color: 'text.secondary', lineHeight: 1.8 }}>
                Through strategic initiatives, partnerships, and community-driven programs, we equip
                youth, women, and marginalized communities with the skills, opportunities, and
                resources needed to thrive in an evolving global landscape.
              </Typography>
            </Box>
          </SectionReveal>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <SectionReveal fillHeight delay={0.08}>
            <Box
              sx={{
                position: 'relative',
                minHeight: { xs: 360, md: 520 },
                height: '100%',
                overflow: 'hidden',
                borderRadius: 5,
                bgcolor: 'primary.dark',
                boxShadow: '0 30px 70px -52px rgba(18,66,42,0.85)',
              }}
            >
              <Box
                component="img"
                src={introImage}
                alt="Impact Africa Alliance community gathering"
                sx={{ width: '100%', height: '100%', minHeight: 'inherit', objectFit: 'cover' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(0deg, rgba(7,31,22,0.9) 0%, rgba(7,31,22,0.24) 62%, rgba(7,31,22,0.08) 100%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  right: 24,
                  bottom: 24,
                  left: 24,
                  p: 2.25,
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: 'common.white',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Typography variant="overline" sx={{ color: 'secondary.light', fontWeight: 750 }}>
                  Founded by young African leaders
                </Typography>
                <Typography sx={{ mt: 0.75, lineHeight: 1.65 }}>
                  Built around homegrown champions, trusted partnerships, and practical solutions.
                </Typography>
              </Box>
            </Box>
          </SectionReveal>
        </Grid>
      </Grid>

      <Box sx={{ mt: { xs: 4, md: 5 } }}>
        <ImpactMetrics />
      </Box>
    </Section>
  );
};

const DirectionCard = ({
  eyebrow,
  title,
  text,
  icon: Icon,
  dark,
}: (typeof DIRECTION_CARDS)[number]): JSX.Element => (
  <Card
    sx={{
      position: 'relative',
      height: '100%',
      overflow: 'hidden',
      border: 0,
      borderRadius: 4,
      bgcolor: dark ? 'primary.main' : 'secondary.main',
      color: dark ? 'primary.contrastText' : brandColors.charcoalBlack,
      boxShadow: dark ? '0 28px 64px -48px rgba(18,66,42,0.9)' : 'none',
      '&::after': {
        position: 'absolute',
        right: -80,
        bottom: -110,
        width: 260,
        height: 260,
        border: `1px solid ${dark ? alpha(brandColors.deepForest, 0.12) : 'rgba(0,30,20,0.16)'}`,
        borderRadius: '50%',
        content: '""',
      },
    }}
  >
    <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 3.5, md: 4.5 } }}>
      <Box
        sx={{
          display: 'grid',
          width: 58,
          height: 58,
          placeItems: 'center',
          borderRadius: 2.5,
          bgcolor: dark ? alpha(brandColors.gold, 0.16) : 'rgba(255,255,255,0.45)',
          color: dark ? 'primary.contrastText' : 'primary.dark',
        }}
      >
        <Icon sx={{ fontSize: 30 }} />
      </Box>
      <Typography
        variant="overline"
        sx={{
          display: 'block',
          mt: 3,
          color: dark ? 'primary.contrastText' : 'primary.dark',
          fontWeight: 800,
          letterSpacing: 1.6,
        }}
      >
        {eyebrow}
      </Typography>
      <Typography variant="h4" sx={{ mt: 1, maxWidth: 500, color: 'inherit', lineHeight: 1.15 }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 2, maxWidth: 560, opacity: dark ? 0.78 : 0.86, lineHeight: 1.75 }}>
        {text}
      </Typography>
    </CardContent>
  </Card>
);

const VisionMission = (): JSX.Element => (
  <Section watermark="africa" watermarkPosition="bottom-right">
    <Grid container spacing={3}>
      {DIRECTION_CARDS.map((card, index) => (
        <Grid key={card.eyebrow} size={{ xs: 12, md: 6 }}>
          <SectionReveal delay={index * 0.06} fillHeight>
            <DirectionCard {...card} />
          </SectionReveal>
        </Grid>
      ))}
    </Grid>
  </Section>
);

const PurposeSection = (): JSX.Element => (
  <Box
    component="section"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      bgcolor: '#0D3020',
      color: 'common.white',
      py: { xs: 8, md: 11 },
      '&::before': {
        position: 'absolute',
        top: -150,
        right: -140,
        width: 420,
        height: 420,
        border: `1px solid ${alpha(brandColors.gold, 0.14)}`,
        borderRadius: '50%',
        boxShadow: `0 0 0 60px ${alpha(brandColors.gold, 0.025)}`,
        content: '""',
      },
    }}
  >
    <Box sx={{ position: 'relative' }}>
      <Section
        color="light"
        eyebrow="Why We Exist"
        title="Our purpose is grounded in Africa's own blueprint for prosperity."
        subtitle="IAA equips youth and women with knowledge, skills, and resources to lead change, drive innovation, and contribute to Africa's socio-economic growth."
      >
        <Grid container spacing={{ xs: 4, md: 5 }} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <SectionReveal fillHeight>
              <Box
                sx={{
                  height: '100%',
                  p: { xs: 3, md: 4 },
                  border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <PublicRoundedIcon sx={{ color: 'secondary.light', fontSize: 42 }} />
                <Typography variant="h4" sx={{ mt: 2, color: 'common.white' }}>
                  Agenda 2063: The Africa We Want
                </Typography>
                <Typography sx={{ mt: 2, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75 }}>
                  Our work aligns with the African Union&apos;s vision for an integrated,
                  prosperous, and peaceful Africa, powered by its own citizens.
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 3 }}>
                  {[
                    'Inclusive growth',
                    'People-driven development',
                    'Pan-African collaboration',
                  ].map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      sx={{
                        bgcolor: alpha(brandColors.gold, 0.16),
                        color: 'secondary.light',
                        fontWeight: 700,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </SectionReveal>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <SectionReveal fillHeight delay={0.08}>
              <Box
                sx={{
                  height: '100%',
                  p: { xs: 3, md: 4 },
                  border: '1px solid rgba(255,255,255,0.13)',
                  borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.05)',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: 'secondary.light', fontWeight: 800, letterSpacing: 1.6 }}
                >
                  UN Sustainable Development Goals
                </Typography>
                <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75 }}>
                  The alliance contributes directly to priority global goals through education,
                  gender equity, decent work, innovation, youth inclusion, and partnerships.
                </Typography>
                <Grid container spacing={1.25} sx={{ mt: 3 }}>
                  {SDG_GOALS.map((goal) => (
                    <Grid key={goal.number} size={{ xs: 12, sm: 6 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          height: '100%',
                          alignItems: 'center',
                          gap: 1.25,
                          p: 1.25,
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.055)',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'grid',
                            width: 34,
                            height: 34,
                            flexShrink: 0,
                            placeItems: 'center',
                            borderRadius: 1.25,
                            bgcolor: 'secondary.main',
                            color: brandColors.charcoalBlack,
                            fontWeight: 850,
                          }}
                        >
                          {goal.number}
                        </Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.84)' }}>
                          {goal.title}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </SectionReveal>
          </Grid>
        </Grid>
      </Section>
    </Box>
  </Box>
);

const ValuesSection = (): JSX.Element => (
  <Section bgcolor="background.default" watermark="network" watermarkPosition="top-left">
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '.85fr 1.15fr' },
        gap: { xs: 4, md: 8 },
        alignItems: 'start',
      }}
    >
      <Box>
        <Typography variant="overline" sx={{ letterSpacing: 2, fontWeight: 700 }}>
          What guides us
        </Typography>
        <Typography variant="h2" sx={{ mt: 2, fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
          Core values with practical weight.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2.5, maxWidth: 420 }}>
          These values shape how we choose partners, design programmes, steward resources, and
          measure progress.
        </Typography>
        <AllianceSculpture />
      </Box>
      <Box>
        {VALUES.map((value, index) => {
          const Icon = value.icon;
          return (
            <SectionReveal key={value.name} delay={index * 0.04}>
              <Box
                component="article"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr',
                  gap: { xs: 2, md: 3 },
                  py: 3,
                  borderTop: 1,
                  borderColor: 'divider',
                  borderBottom: index === VALUES.length - 1 ? 1 : 0,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: index % 2 ? 'secondary.main' : 'primary.main',
                    color: brandColors.deepForest,
                  }}
                >
                  <Icon aria-hidden sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography component="h3" sx={{ fontSize: '1.4rem', fontWeight: 600, mb: 1 }}>
                    {value.name}
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: '.95rem', lineHeight: 1.75 }}>
                    {value.text}
                  </Typography>
                </Box>
              </Box>
            </SectionReveal>
          );
        })}
      </Box>
    </Box>
  </Section>
);

const Timeline = (): JSX.Element => (
  <Box sx={{ position: 'relative' }}>
    <Stack spacing={2.25}>
      {MILESTONES.map((milestone, index) => {
        const isFuture = milestone.year.includes('+');
        return (
          <SectionReveal key={milestone.year} delay={index * 0.05}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '110px 1fr' },
                gap: { xs: 1.5, sm: 2.5 },
                p: { xs: 2.5, md: 3 },
                border: '1px solid rgba(0,30,20,0.1)',
                borderRadius: 3,
                bgcolor: 'background.paper',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: isFuture ? 'secondary.dark' : 'text.primary',
                    fontFamily: brandFonts.body,
                    fontSize: { xs: '1.75rem', md: '2.15rem' },
                    fontStyle: 'italic',
                    fontWeight: 850,
                    lineHeight: 1,
                  }}
                >
                  {milestone.year}
                </Typography>
                {isFuture && (
                  <Chip
                    size="small"
                    label="Next"
                    color="secondary"
                    sx={{ mt: 1, fontWeight: 750 }}
                  />
                )}
              </Box>
              <Box>
                <Typography variant="h6">{milestone.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.75 }}>
                  {milestone.text}
                </Typography>
                {milestone.linkUrl && (
                  <Link
                    href={milestone.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{
                      display: 'inline-block',
                      mt: 1,
                      color: 'primary.main',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                    }}
                  >
                    {milestone.linkLabel ?? 'Learn more'}
                  </Link>
                )}
              </Box>
            </Box>
          </SectionReveal>
        );
      })}
    </Stack>
  </Box>
);

const StorySection = (): JSX.Element => (
  <Section eyebrow="Our Story" title="A young alliance, built with a long horizon.">
    <Grid container spacing={{ xs: 4, md: 6 }} sx={{ alignItems: 'stretch' }}>
      <Grid size={{ xs: 12, md: 4 }}>
        <SectionReveal fillHeight>
          <Box
            sx={{
              display: 'flex',
              height: '100%',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflow: 'hidden',
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{ color: 'primary.contrastText', fontWeight: 800, letterSpacing: 1.7 }}
              >
                From conviction to institution
              </Typography>
              <Typography variant="h4" sx={{ mt: 1.5 }}>
                We are building the kind of institution Africa&apos;s future deserves.
              </Typography>
            </Box>
            <Typography
              sx={{ mt: 4, color: alpha(brandColors.deepForest, 0.72), lineHeight: 1.75 }}
            >
              The work begins with practical programs today, and scales toward a Pan-African network
              of leadership, skills, and opportunity.
            </Typography>
          </Box>
        </SectionReveal>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Timeline />
      </Grid>
    </Grid>
  </Section>
);

const TeamEmptyState = (): JSX.Element => (
  <Card
    sx={{ overflow: 'hidden', borderRadius: 4, boxShadow: '0 28px 70px -56px rgba(18,66,42,0.9)' }}
  >
    <Grid container>
      <Grid
        size={{ xs: 12, md: 5 }}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: { xs: 4, md: 5 },
        }}
      >
        <Diversity3RoundedIcon
          sx={{
            position: 'absolute',
            right: -26,
            bottom: -30,
            color: alpha(brandColors.deepForest, 0.08),
            fontSize: 210,
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'grid',
              width: 62,
              height: 62,
              placeItems: 'center',
              borderRadius: 2.5,
              bgcolor: 'secondary.main',
              color: brandColors.charcoalBlack,
            }}
          >
            <GroupsRoundedIcon sx={{ fontSize: 34 }} />
          </Box>
          <Typography variant="h4" sx={{ mt: 3 }}>
            A team as bold as the mission.
          </Typography>
          <Typography sx={{ mt: 2, color: alpha(brandColors.deepForest, 0.76), lineHeight: 1.75 }}>
            IAA is led by young African professionals united by one conviction: sustainable change
            must be homegrown.
          </Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }} sx={{ p: { xs: 4, md: 5 } }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.primary', fontWeight: 800, letterSpacing: 1.6 }}
        >
          Profiles coming soon
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.75 }}>
          The disciplines on our bench
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.75 }}>
          We&apos;re putting names and faces to the work. The operating bench spans technology,
          development, finance, communications, and advocacy.
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1.25} sx={{ mt: 3 }}>
          {DISCIPLINES.map(({ label, icon: Icon }) => (
            <Chip
              key={label}
              icon={<Icon />}
              label={label}
              variant="outlined"
              sx={{
                borderColor: 'rgba(0,30,20,0.24)',
                color: 'text.primary',
                fontWeight: 700,
                '& .MuiChip-icon': { color: 'text.secondary' },
              }}
            />
          ))}
        </Stack>
        <Button
          component={RouterLink}
          to="/get-involved#volunteer"
          variant="contained"
          endIcon={<EastIcon />}
          sx={{ mt: 3.5, fontWeight: 750 }}
        >
          Work with us
        </Button>
      </Grid>
    </Grid>
  </Card>
);

const TeamMemberCard = ({ member }: { member: TeamMember }): JSX.Element => {
  const artwork = useSiteImage('team-artwork');
  return (
    <Card
      component="article"
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 350,
        aspectRatio: '3 / 4',
        overflow: 'hidden',
        border: 1,
        borderColor: 'divider',
        borderRadius: 4,
        boxShadow: 'none',
        bgcolor: brandColors.deepForest,
        color: brandColors.white,
        '&:hover .team-artwork, &:focus-within .team-artwork': { transform: 'scale(1.045)' },
        '&:hover .team-bio-link, &:focus-within .team-bio-link': {
          opacity: 1,
          transform: 'translateY(0)',
        },
        '@media (hover: none)': {
          '& .team-bio-link': { opacity: 1, transform: 'none' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& .team-artwork, & .team-bio-link': { transition: 'none', transform: 'none' },
        },
      }}
    >
      {/*
        The member's own portrait when the dashboard has one, and the alliance
        artwork only as a fallback. The artwork is decorative, so it carries an
        empty alt; a real portrait is named for screen readers.
      */}
      <Box
        className="team-artwork"
        component="img"
        src={member.photo?.url ?? artwork}
        alt={member.photo?.url ? (member.photo.alt ?? member.name) : ''}
        loading="lazy"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          // Portraits are framed 4:5 with the face high, so bias the crop
          // upward rather than centring it in this 3:4 card.
          objectFit: 'cover',
          objectPosition: member.photo?.url ? 'center 22%' : 'center',
          transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, transparent 35%, rgba(4,21,16,.3) 55%, rgba(4,21,16,.96) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Box sx={{ position: 'absolute', inset: 'auto 0 0', p: 2.5 }}>
        <Typography
          component="h3"
          sx={{ fontSize: { xs: '1.35rem', md: '1.5rem' }, fontWeight: 600, lineHeight: 1.2 }}
        >
          {member.name}
        </Typography>
        <Typography
          sx={{ mt: 0.75, color: 'rgba(255,255,255,.86)', fontSize: '.9rem', lineHeight: 1.5 }}
        >
          {member.role}
        </Typography>
        <Button
          className="team-bio-link"
          component={RouterLink}
          to={'/about/team/' + member.id}
          aria-label={`Read full bio of ${member.name}`}
          endIcon={<EastIcon />}
          sx={{
            mt: 1.5,
            px: 0,
            color: brandColors.mint,
            opacity: 0,
            transform: 'translateY(8px)',
            transition: 'opacity 220ms ease, transform 220ms ease',
            '&:hover': { color: brandColors.white, bgcolor: 'transparent' },
            '&:focus-visible': { outline: `2px solid ${brandColors.gold}`, outlineOffset: 3 },
          }}
        >
          Read full bio
        </Button>
      </Box>
    </Card>
  );
};

const TeamGrid = ({ members }: { members: TeamMember[] }): JSX.Element => (
  <Grid container spacing={3}>
    {members.map((member, index) => (
      <Grid key={member.id} size={{ xs: 12, sm: 6, lg: 3 }} sx={{ display: 'flex' }}>
        <SectionReveal delay={index * 0.05} fillHeight>
          <TeamMemberCard member={member} />
        </SectionReveal>
      </Grid>
    ))}
  </Grid>
);

const TeamTierGroup = ({
  tier,
  members,
}: {
  tier: TeamTier;
  members: TeamMember[];
}): JSX.Element => (
  <Box sx={{ mb: 7, '&:last-of-type': { mb: 0 } }}>
    <Typography
      variant="overline"
      sx={{
        display: 'block',
        mb: 2.5,
        color: 'text.primary',
        fontWeight: 800,
        letterSpacing: 1.8,
      }}
    >
      {TEAM_TIER_LABELS[tier]}
    </Typography>
    {/*
      One card per person, every card the same. Seniority is carried by the
      order the dashboard gives them, not by the size of their card.
    */}
    <TeamGrid members={members} />
  </Box>
);

export const TeamSection = (): JSX.Element => {
  const { data, isLoading } = useTeam();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#team' || isLoading) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById('team')?.scrollIntoView({ block: 'start' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash, isLoading]);

  const members = data?.items ?? [];
  const isEmpty = !isLoading && members.length === 0;

  return (
    <Box id="team" sx={{ scrollMarginTop: 120 }}>
      <Section
        eyebrow="The People Behind IAA"
        title="Built by practitioners, organizers, and builders."
        subtitle="IAA brings together young African professionals with the cross-functional skills needed to move from ideas to durable institutions."
        bgcolor="background.default"
      >
        {isLoading && <CardGridSkeleton count={4} columns={4} />}
        {isEmpty && <TeamEmptyState />}
        {!isLoading &&
          TEAM_TIERS.map((tier) => {
            const group = members.filter((member) => member.tier === tier);
            return group.length === 0 ? null : (
              <TeamTierGroup key={tier} tier={tier} members={group} />
            );
          })}
      </Section>
    </Box>
  );
};

const OrgStructureSection = (): JSX.Element => (
  <Section
    eyebrow="How We Are Organized"
    title="A distributed structure for Pan-African delivery."
    subtitle="IAA is designed to stay close to communities while keeping strategy, accountability, and learning connected across countries."
  >
    <Grid container spacing={{ xs: 4, md: 5 }} sx={{ alignItems: 'center' }}>
      <Grid size={{ xs: 12, md: 4 }}>
        <SectionReveal fillHeight>
          <Box
            sx={{
              height: '100%',
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <AccountTreeRoundedIcon sx={{ color: 'primary.contrastText', fontSize: 44 }} />
            <Typography variant="h4" sx={{ mt: 2 }}>
              Central clarity, local ownership.
            </Typography>
            <Typography
              sx={{ mt: 2, color: alpha(brandColors.deepForest, 0.75), lineHeight: 1.75 }}
            >
              The structure supports governance, program quality, and local adaptation without
              losing the human texture of community-led work.
            </Typography>
          </Box>
        </SectionReveal>
      </Grid>
      <Grid size={{ xs: 12, md: 8 }}>
        <Stack spacing={1.5}>
          {STRUCTURE_LEVELS.map((level, index) => (
            <SectionReveal key={level.title} delay={index * 0.04}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '44px 1fr', md: '64px 1fr' },
                  gap: 2,
                  alignItems: 'center',
                  p: { xs: 2, md: 2.5 },
                  border: '1px solid rgba(0,30,20,0.1)',
                  borderRadius: 3,
                  bgcolor: index === 0 ? alpha(brandColors.gold, 0.12) : 'background.paper',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    width: { xs: 44, md: 54 },
                    height: { xs: 44, md: 54 },
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: index === 0 ? 'secondary.main' : 'rgba(0,30,20,0.08)',
                    color: index === 0 ? brandColors.charcoalBlack : 'text.primary',
                    fontWeight: 850,
                  }}
                >
                  {index + 1}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{level.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                    {level.text}
                  </Typography>
                </Box>
              </Box>
            </SectionReveal>
          ))}
        </Stack>
      </Grid>
    </Grid>
  </Section>
);

const PartnersSection = (): JSX.Element => {
  const { data, isLoading } = usePartners();
  if (!isLoading && (!data || data.items.length === 0)) {
    return <></>;
  }

  const partners = data?.items ?? [];

  return (
    <Section
      eyebrow="Our Partners"
      title="Collaborating for impact."
      subtitle="Partnerships help IAA scale responsibly, learn faster, and connect community work to larger systems of change."
      textAlign="center"
      bgcolor="background.default"
    >
      {isLoading ? (
        <PartnerLogosSkeleton />
      ) : (
        <Grid container spacing={2.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          {partners.map((partner, index) => (
            <Grid
              key={partner.id}
              size={{ xs: 6, sm: 4, md: 3, lg: 2 }}
              sx={{ display: 'flex', justifyContent: 'center' }}
            >
              <SectionReveal delay={index * 0.04}>
                <Box
                  component={partner.websiteUrl ? 'a' : 'div'}
                  href={partner.websiteUrl}
                  target={partner.websiteUrl ? '_blank' : undefined}
                  rel={partner.websiteUrl ? 'noopener noreferrer' : undefined}
                  sx={{
                    display: 'flex',
                    width: '100%',
                    minWidth: 150,
                    height: 88,
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2,
                    py: 1.5,
                    border: '1px solid rgba(0,30,20,0.1)',
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    boxShadow: `inset 0 1px 0 ${alpha('#FFFFFF', 0.8)}`,
                    transition:
                      'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
                    '&:hover': partner.websiteUrl
                      ? {
                          borderColor: 'rgba(0,30,20,0.26)',
                          boxShadow: '0 20px 42px -36px rgba(18,66,42,0.8)',
                          transform: 'translateY(-3px)',
                        }
                      : undefined,
                  }}
                >
                  <Box
                    component="img"
                    src={partner.logo.url}
                    alt={partner.name}
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 52,
                      filter: 'grayscale(100%)',
                      objectFit: 'contain',
                      opacity: 0.78,
                    }}
                  />
                </Box>
              </SectionReveal>
            </Grid>
          ))}
        </Grid>
      )}
    </Section>
  );
};

const About = (): JSX.Element => {
  const copy = usePageCopy('about', {
    seoTitle: 'About Us — Our Mission, Vision & Team',
    seoDescription:
      'Impact Africa Alliance is a purpose-driven, Pan-African organization committed to sustainable development and transformative change across Africa.',
    heroEyebrow: 'About Impact Africa Alliance',
    heroTitle: 'Purpose-driven. Pan-African. Built to last.',
    heroSubtitle:
      "We equip youth, women, and communities with the skills, partnerships, and opportunities to shape Africa's future from the inside out.",
  });
  return (
    <>
      <Seo title={copy.seoTitle} description={copy.seoDescription} />
      <PageHero
        eyebrow={copy.heroEyebrow}
        title={copy.heroTitle}
        subtitle={copy.heroSubtitle}
        image={copy.heroImageUrl ?? IMAGES.community}
      />
      <AboutIntro />
      <VisionMission />
      <PurposeSection />
      <ValuesSection />
      <StorySection />
      <TeamSection />
      <OrgStructureSection />
      <PartnersSection />
      <PageCta copy={copy} />
    </>
  );
};

export default About;
