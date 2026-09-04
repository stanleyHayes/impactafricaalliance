import { SDG_GOALS, brandColors, brandFonts, type TeamMember } from '@iaa/shared';
import type { SvgIconComponent } from '@mui/icons-material';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import EastIcon from '@mui/icons-material/East';
import FacebookIcon from '@mui/icons-material/Facebook';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import InstagramIcon from '@mui/icons-material/Instagram';
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import RecyclingRoundedIcon from '@mui/icons-material/RecyclingRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VolunteerActivismRoundedIcon from '@mui/icons-material/VolunteerActivismRounded';
import XIcon from '@mui/icons-material/X';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { PageCta } from '../components/PageCta';
import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { CardGridSkeleton, PartnerLogosSkeleton } from '../components/skeletons';
import { IMAGES } from '../content/images';
import { useImpactStats, usePageCopy, usePartners, useTeam } from '../lib/content-hooks';

interface ProofPoint {
  value: string;
  label: string;
  text: string;
}

/** Short descriptor shown under each proof point, matched on the stat's label. */
const PROOF_BLURBS: readonly (readonly [RegExp, string])[] = [
  [/\b(countr(y|ies)|nations?|regions?)\b/i, 'A growing West African footprint.'],
  [/\b(women|woman|girls?)\b/i, 'Training, mentorship, and enterprise support.'],
  [/\b(youth|young|students?|learners?)\b/i, 'Skills, mentorship, and pathways into work.'],
  [/\b(programs?|programmes?|initiatives?)\b/i, 'Flagship initiatives across the alliance.'],
  [/\b(partners?|allies)\b/i, 'Multi-sector collaboration across the continent.'],
];

const blurbFor = (label: string): string =>
  PROOF_BLURBS.find(([pattern]) => pattern.test(label))?.[1] ??
  'Measured progress across our programmes.';

/** Shown only until the CMS impact stats load. Keep in step with the CMS values. */
const FALLBACK_PROOF_POINTS: readonly ProofPoint[] = [
  { value: '3+', label: 'Countries reached', text: 'A growing West African footprint.' },
  { value: '500+', label: 'Women', text: 'Training, mentorship, and enterprise support.' },
  { value: '200+', label: 'Youth', text: 'Skills, mentorship, and pathways into work.' },
];

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

const AboutIntro = (): JSX.Element => {
  const { data } = useImpactStats();
  const proofPoints: readonly ProofPoint[] = data?.items.length
    ? data.items.slice(0, 3).map((stat) => ({
        value: `${stat.value.toLocaleString()}${stat.suffix}`,
        label: stat.label,
        text: blurbFor(stat.label),
      }))
    : FALLBACK_PROOF_POINTS;

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
              sx={{ mt: 2, maxWidth: 680, fontSize: { xs: '2rem', md: '3rem' }, lineHeight: 1.08 }}
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
              src={IMAGES.community}
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

    <Grid container spacing={2.5} sx={{ mt: { xs: 4, md: 6 } }}>
      {proofPoints.map((item, index) => (
        <Grid key={item.label} size={{ xs: 12, md: 4 }}>
          <SectionReveal delay={index * 0.06}>
            <Box
              sx={{
                height: '100%',
                p: { xs: 2.5, md: 3 },
                border: '1px solid rgba(0,30,20,0.1)',
                borderRadius: 3,
                bgcolor: 'background.paper',
              }}
            >
              <Typography
                sx={{
                  color: 'text.primary',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: { xs: '2.2rem', md: '2.7rem' },
                  fontWeight: 850,
                  lineHeight: 1,
                }}
              >
                {item.value}
              </Typography>
              <Typography sx={{ mt: 1, fontWeight: 750 }}>{item.label}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {item.text}
              </Typography>
            </Box>
          </SectionReveal>
        </Grid>
      ))}
    </Grid>
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
  <Section
    eyebrow="What Guides Us"
    title="Core values with practical weight."
    subtitle="These are not slogans. They shape how we choose partners, design programs, steward resources, and measure progress."
    textAlign="center"
    bgcolor="background.default"
    watermark="radar"
    watermarkPosition="top-left"
  >
    <Grid container spacing={2.5} sx={{ justifyContent: 'center' }}>
      {VALUES.map((value, index) => {
        const Icon = value.icon;
        return (
          <Grid key={value.name} size={{ xs: 12, sm: 6, md: index < 3 ? 4 : 5 }}>
            <SectionReveal delay={index * 0.04} fillHeight>
              <Card
                sx={{
                  position: 'relative',
                  height: '100%',
                  overflow: 'hidden',
                  border: '1px solid rgba(0,30,20,0.1)',
                  borderRadius: 4,
                  bgcolor: 'background.paper',
                  boxShadow: 'none',
                  transition:
                    'transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
                  '&:hover': {
                    borderColor: 'rgba(0,30,20,0.26)',
                    boxShadow: '0 24px 54px -46px rgba(18,66,42,0.8)',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 3.5 }, textAlign: 'left' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box
                      sx={{
                        display: 'grid',
                        width: 54,
                        height: 54,
                        placeItems: 'center',
                        borderRadius: 2.5,
                        bgcolor: 'rgba(0,30,20,0.08)',
                        color: 'text.primary',
                      }}
                    >
                      <Icon sx={{ fontSize: 29 }} />
                    </Box>
                    <Typography
                      aria-hidden
                      sx={{ color: 'rgba(0,30,20,0.18)', fontWeight: 850, letterSpacing: 1.5 }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ mt: 3 }}>
                    {value.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.25, lineHeight: 1.75 }}
                  >
                    {value.text}
                  </Typography>
                </CardContent>
              </Card>
            </SectionReveal>
          </Grid>
        );
      })}
    </Grid>
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
            <Typography sx={{ mt: 4, color: alpha(brandColors.deepForest, 0.72), lineHeight: 1.75 }}>
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

type SocialField = 'linkedInUrl' | 'xUrl' | 'instagramUrl' | 'facebookUrl' | 'tiktokUrl';

/** Rendered in this order, and only for the links a member actually has. */
const MEMBER_SOCIALS: ReadonlyArray<{
  field: SocialField;
  label: string;
  Icon: SvgIconComponent;
}> = [
  { field: 'linkedInUrl', label: 'LinkedIn', Icon: LinkedInIcon },
  { field: 'xUrl', label: 'X', Icon: XIcon },
  { field: 'instagramUrl', label: 'Instagram', Icon: InstagramIcon },
  { field: 'facebookUrl', label: 'Facebook', Icon: FacebookIcon },
  { field: 'tiktokUrl', label: 'TikTok', Icon: MusicNoteRoundedIcon },
];

const memberInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const TeamMemberCard = ({ member }: { member: TeamMember }): JSX.Element => {
  const socials = MEMBER_SOCIALS.flatMap(({ field, label, Icon }) => {
    const href = member[field];
    return href ? [{ field, label, Icon, href }] : [];
  });

  return (
    <Card
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${alpha(brandColors.deepForest, 0.1)}`,
        borderRadius: 4,
        boxShadow: 'none',
        transition: 'transform 260ms ease, border-color 260ms ease, box-shadow 260ms ease',
        '&:hover': {
          borderColor: alpha(brandColors.deepForest, 0.26),
          boxShadow: '0 28px 60px -44px rgba(14,42,34,0.65)',
          transform: 'translateY(-5px)',
          '& .team-card-photo': { transform: 'scale(1.05)' },
          '& .team-card-bar': { transform: 'scaleX(1)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '4 / 5',
          overflow: 'hidden',
          bgcolor: brandColors.deepForest,
        }}
      >
        {member.photo?.url ? (
          <Box
            className="team-card-photo"
            component="img"
            src={member.photo.url}
            alt={member.name}
            loading="lazy"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `radial-gradient(circle at 30% 20%, ${alpha(brandColors.forest, 0.85)}, ${brandColors.deepForest})`,
            }}
          >
            <Typography
              sx={{
                fontSize: '3.75rem',
                fontWeight: 850,
                letterSpacing: 2,
                color: alpha(brandColors.gold, 0.9),
              }}
            >
              {memberInitials(member.name)}
            </Typography>
          </Box>
        )}
        {socials.length > 0 && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ position: 'absolute', right: 12, bottom: 12 }}
          >
            {socials.map(({ field, label, Icon, href }) => (
              <IconButton
                key={field}
                component="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${member.name} on ${label}`}
                size="small"
                sx={{
                  bgcolor: alpha(brandColors.white, 0.92),
                  color: brandColors.forest,
                  transition:
                    'background-color 200ms ease, color 200ms ease, transform 200ms ease',
                  '&:hover': {
                    bgcolor: brandColors.gold,
                    color: brandColors.charcoalBlack,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Icon fontSize="small" />
              </IconButton>
            ))}
          </Stack>
        )}
      </Box>
      <CardContent
        sx={{ p: { xs: 2.5, md: 3 }, display: 'flex', flexDirection: 'column', flexGrow: 1 }}
      >
        <Box
          className="team-card-bar"
          sx={{
            height: 3,
            width: 44,
            mb: 2,
            borderRadius: 2,
            bgcolor: brandColors.gold,
            transform: 'scaleX(0.45)',
            transformOrigin: 'left',
            transition: 'transform 320ms ease',
          }}
        />
        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
          {member.name}
        </Typography>
        <Typography
          sx={{ mt: 0.5, color: brandColors.forest, fontSize: '0.9rem', fontWeight: 750 }}
        >
          {member.role}
        </Typography>
        {member.bio && (
          <Typography
            color="text.secondary"
            sx={{
              mt: 1.5,
              fontSize: '0.95rem',
              lineHeight: 1.7,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 4,
              overflow: 'hidden',
            }}
          >
            {member.bio}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const TeamSection = (): JSX.Element => {
  const { data, isLoading } = useTeam();
  const members = data?.items ?? [];
  const isEmpty = !isLoading && members.length === 0;

  return (
    <Section
      eyebrow="The People Behind IAA"
      title="Built by practitioners, organizers, and builders."
      subtitle="IAA brings together young African professionals with the cross-functional skills needed to move from ideas to durable institutions."
      bgcolor="background.default"
    >
      {isLoading && <CardGridSkeleton count={4} columns={4} />}
      {isEmpty && <TeamEmptyState />}
      {!isLoading && members.length > 0 && (
        <Grid container spacing={3}>
          {members.map((member, index) => (
            <Grid key={member.id} size={{ xs: 12, sm: 6, lg: 4 }} sx={{ display: 'flex' }}>
              <SectionReveal delay={index * 0.05} fillHeight>
                <TeamMemberCard member={member} />
              </SectionReveal>
            </Grid>
          ))}
        </Grid>
      )}
    </Section>
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
            <Typography sx={{ mt: 2, color: alpha(brandColors.deepForest, 0.75), lineHeight: 1.75 }}>
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
    seoDescription: 'Impact Africa Alliance is a purpose-driven, Pan-African organization committed to sustainable development and transformative change across Africa.',
    heroEyebrow: 'About Impact Africa Alliance',
    heroTitle: 'Purpose-driven. Pan-African. Built to last.',
    heroSubtitle: "We equip youth, women, and communities with the skills, partnerships, and opportunities to shape Africa's future from the inside out.",
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
