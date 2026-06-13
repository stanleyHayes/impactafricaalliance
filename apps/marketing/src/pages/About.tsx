import { brandColors } from '@iaa/shared';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { PageHero } from '../components/PageHero';
import { Section } from '../components/Section';
import { SectionReveal } from '../components/SectionReveal';
import { Seo } from '../components/Seo';
import { CardGridSkeleton } from '../components/skeletons';
import { useTeam } from '../lib/content-hooks';

const VALUES = [
  {
    emoji: '🤝',
    name: 'Inclusivity',
    text: 'Ensuring every African — regardless of background, gender, or ability — has access to opportunities for growth and success.',
  },
  {
    emoji: '💡',
    name: 'Innovation',
    text: "Leveraging technology and creative problem-solving to address Africa's pressing challenges with bold, scalable solutions.",
  },
  {
    emoji: '🌐',
    name: 'Collaboration',
    text: 'Partnering with local and global stakeholders to amplify collective impact.',
  },
  {
    emoji: '♻️',
    name: 'Sustainability',
    text: 'Designing programs that create long-term, positive change — embedded in the communities we serve.',
  },
  {
    emoji: '🏛️',
    name: 'Integrity',
    text: 'Upholding the highest standards of transparency, accountability, and ethical conduct.',
  },
];

const MILESTONES = [
  {
    year: '2024',
    title: 'The Idea Takes Shape',
    text: 'A group of young African leaders come together with a shared conviction: the continent’s transformation must be led by Africans, for Africans. Impact Africa Alliance is born.',
  },
  {
    year: '2025',
    title: 'Building the Foundation',
    text: 'The founding team develops IAA’s brand identity, organizational structure, flagship programs, and strategic roadmap across Ghana, Sierra Leone, and Nigeria.',
  },
  {
    year: '2026',
    title: 'Going Live',
    text: 'IAA launches officially — website, social media presence, and the first cohort of programs. The journey of impact begins.',
  },
  {
    year: '2027+',
    title: 'Scaling Across Africa',
    text: 'IAA targets expansion into additional African countries, a digital learning platform, and a Pan-African Youth Leadership Network.',
  },
];

const VisionMission = (): JSX.Element => (
  <Grid container spacing={3}>
    <Grid size={{ xs: 12, md: 6 }}>
      <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'common.white' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5">🌍 Our Vision</Typography>
          <Typography sx={{ mt: 2, opacity: 0.95 }}>
            To build an inclusive, empowered, and sustainable Africa where every individual has the
            opportunity to reach their full potential and contribute meaningfully to society.
          </Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <Card sx={{ height: '100%', bgcolor: 'secondary.main', color: brandColors.charcoalBlack }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5">🎯 Our Mission</Typography>
          <Typography sx={{ mt: 2 }}>
            To drive sustainable impact in Africa by fostering innovation, enhancing skills
            development, promoting economic empowerment, and championing social inclusion through
            collaborative and transformative initiatives.
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

const TeamSection = (): JSX.Element => {
  const { data, isLoading } = useTeam();
  const members = data?.items ?? [];
  if (!isLoading && members.length === 0) {
    return (
      <Section eyebrow="The People Behind IAA" title="Our Team" bgcolor={brandColors.offWhite}>
        <Typography color="text.secondary">
          Our team profiles are coming soon. IAA is led by a passionate team of young African
          professionals spanning technology, development, finance, communications, and advocacy.
        </Typography>
      </Section>
    );
  }
  return (
    <Section eyebrow="The People Behind IAA" title="Our Team" bgcolor={brandColors.offWhite}>
      {isLoading ? (
        <CardGridSkeleton count={4} columns={4} />
      ) : (
        <Grid container spacing={3}>
          {members.map((member) => (
            <Grid key={member.id} size={{ xs: 6, md: 3 }}>
              <Stack alignItems="center" textAlign="center" spacing={1}>
                <Avatar src={member.photo?.url} sx={{ width: 96, height: 96 }}>
                  {member.name.charAt(0)}
                </Avatar>
                <Typography sx={{ fontWeight: 700 }}>{member.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {member.role}
                </Typography>
                {member.linkedInUrl && (
                  <Link href={member.linkedInUrl} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </Link>
                )}
              </Stack>
            </Grid>
          ))}
        </Grid>
      )}
    </Section>
  );
};

const About = (): JSX.Element => (
  <>
    <Seo
      title="About Us — Our Mission, Vision & Team"
      description="Impact Africa Alliance is a purpose-driven, Pan-African organization committed to sustainable development and transformative change across Africa."
    />
    <PageHero title="About Us" subtitle="Purpose-driven. Pan-African. Built to last." />

    <Section eyebrow="Who We Are" title="Architects of Africa’s Transformation">
      <Stack spacing={2} sx={{ maxWidth: 860 }}>
        <Typography>
          Impact Africa Alliance (IAA) is a dynamic, purpose-driven organization committed to
          driving sustainable development and transformative change across Africa.
        </Typography>
        <Typography color="text.secondary">
          We believe in the power of youth leadership, collaboration, innovation, and inclusivity to
          create a prosperous and equitable future for all Africans. Through strategic initiatives,
          partnerships, and community-driven programs, we equip youth, women, and marginalized
          communities with the skills, opportunities, and resources needed to thrive.
        </Typography>
      </Stack>
    </Section>

    <Section bgcolor={brandColors.offWhite}>
      <VisionMission />
    </Section>

    <Section eyebrow="What Guides Us" title="Our Core Values" textAlign="center">
      <Grid container spacing={3}>
        {VALUES.map((value) => (
          <Grid key={value.name} size={{ xs: 12, sm: 6, md: 4 }}>
            <SectionReveal>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography sx={{ fontSize: 36 }} aria-hidden>
                    {value.emoji}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {value.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {value.text}
                  </Typography>
                </CardContent>
              </Card>
            </SectionReveal>
          </Grid>
        ))}
      </Grid>
    </Section>

    <Section eyebrow="Our Story" title="Milestones" bgcolor={brandColors.offWhite}>
      <Stack spacing={3}>
        {MILESTONES.map((milestone) => (
          <SectionReveal key={milestone.year}>
            <Stack direction="row" spacing={3}>
              <Box sx={{ minWidth: 80 }}>
                <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>
                  {milestone.year}
                </Typography>
              </Box>
              <Box sx={{ borderLeft: 3, borderColor: 'secondary.main', pl: 3 }}>
                <Typography variant="h6">{milestone.title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {milestone.text}
                </Typography>
              </Box>
            </Stack>
          </SectionReveal>
        ))}
      </Stack>
    </Section>

    <TeamSection />
  </>
);

export default About;
