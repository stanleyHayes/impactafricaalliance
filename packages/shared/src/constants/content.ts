/**
 * Stable reference data referenced across the marketing site and admin.
 * Centralised here to avoid duplicated string literals (a SonarQube smell)
 * and to keep the SDG / pillar / nav definitions in one auditable place.
 */

export interface NavLink {
  readonly label: string;
  readonly path: string;
}

export const PRIMARY_NAV: readonly NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Our Work', path: '/our-work' },
  { label: 'Impact', path: '/impact' },
  { label: 'Get Involved', path: '/get-involved' },
  { label: 'Resources', path: '/resources' },
  { label: 'Contact', path: '/contact' },
];

export const FOOTER_LEGAL_LINKS: readonly NavLink[] = [
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Cookie Policy', path: '/cookie-policy' },
  { label: 'Terms of Use', path: '/terms-of-use' },
  { label: 'Privacy Request', path: '/privacy-request' },
];

export interface PillarDefinition {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly path: string;
}

export const PILLARS: readonly PillarDefinition[] = [
  {
    key: 'digital-skills',
    title: 'Digital Skills & Innovation Hub',
    description:
      'Bridging the gap between education and employment, one digital skill at a time. We train youth in coding, social media, e-commerce, and entrepreneurship.',
    path: '/our-work/digital-skills',
  },
  {
    key: 'stem-learning',
    title: 'STEM & Vocational Digital Learning',
    description:
      'Accessible, market-relevant STEM and vocational training through an engaging online platform. Certified, practical, and connected to careers.',
    path: '/our-work/stem-learning',
  },
  {
    key: 'climate-action',
    title: 'Climate Action & Renewable Energy',
    description:
      'Mobilizing communities and youth to fight climate change through clean energy, climate-smart farming, and land restoration programs.',
    path: '/our-work/climate-action',
  },
  {
    key: 'women-empowerment',
    title: 'Women Empowerment & Mentorship',
    description:
      'Equipping women with digital skills, entrepreneurship training, and leadership mentorship to transform their economic futures.',
    path: '/our-work/women-empowerment',
  },
];

export interface SdgGoal {
  readonly number: number;
  readonly title: string;
  readonly contribution: string;
}

export const SDG_GOALS: readonly SdgGoal[] = [
  {
    number: 4,
    title: 'Quality Education',
    contribution: 'Digital skills training, STEM learning platform, vocational certifications',
  },
  {
    number: 5,
    title: 'Gender Equality',
    contribution: "Women's empowerment program, digital entrepreneurship, mentorship",
  },
  {
    number: 7,
    title: 'Clean Energy',
    contribution: 'Community solar, wind, and biogas installations',
  },
  {
    number: 8,
    title: 'Decent Work & Growth',
    contribution: 'Job placement, startup incubation, apprenticeships',
  },
  {
    number: 9,
    title: 'Industry & Innovation',
    contribution: 'Tech entrepreneurship, digital transformation training',
  },
  {
    number: 10,
    title: 'Reduced Inequalities',
    contribution: 'Focus on marginalized communities, gender-inclusive programming',
  },
  {
    number: 13,
    title: 'Climate Action',
    contribution: 'Reforestation, climate-smart agriculture, youth climate advocacy',
  },
  {
    number: 17,
    title: 'Partnerships',
    contribution: 'Multi-sector collaboration with NGOs, government, and private sector',
  },
];

export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/share/1CaxnPfuFZ/?mibextid=wwXIfr',
  instagram: 'https://www.instagram.com/impactafricaalliance.global/',
  linkedin: 'https://www.linkedin.com/company/impact-africa-alliance/',
  twitter: 'https://x.com/impactafricang',
  tiktok: 'https://www.tiktok.com/@impact_aa',
} as const;

export const ORG = {
  name: 'Impact Africa Alliance',
  shortName: 'IAA',
  tagline: 'Empowering Africa. One Community at a Time.',
  email: 'info@impactafricaalliance.org',
  careersEmail: 'careers@impactafricaalliance.org',
  website: 'https://www.impactafricaalliance.org',
  description:
    'Impact Africa Alliance equips youth, women, and communities across Africa with the skills, tools, and opportunities to build a prosperous and equitable future.',
} as const;
