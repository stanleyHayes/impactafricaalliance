/**
 * Flagship initiative copy, transcribed from docs/website-content.md (Our Work).
 * Static brand content — not CMS-managed — so it ships with the build and never
 * shows an empty state.
 */
export interface ProgramContent {
  slug: string;
  initiative: string;
  title: string;
  descriptor: string;
  challenge: string;
  whatWeDo: string[];
  goal: string;
}

export const PROGRAMS: readonly ProgramContent[] = [
  {
    slug: 'digital-skills',
    initiative: 'Initiative 01',
    title: 'Digital Skills & Innovation Hub',
    descriptor:
      "Bridging Africa's digital divide — one skill, one entrepreneur, one community at a time.",
    challenge:
      'Millions of young Africans graduate each year without the digital skills employers need. The gap between classroom education and the job market leaves entire generations underemployed, despite Africa’s growing digital economy.',
    whatWeDo: [
      'Digital literacy and coding bootcamps for beginners through to advanced developers',
      'Social media marketing, content creation, and e-commerce training',
      'Startup incubation and entrepreneurship mentorship programs',
      'Job placement support, apprenticeships, and professional networking opportunities',
    ],
    goal: 'To equip thousands of young Africans with in-demand digital skills that unlock employment, entrepreneurship, and economic independence — contributing directly to SDG 8 and SDG 4.',
  },
  {
    slug: 'stem-learning',
    initiative: 'Initiative 02',
    title: 'STEM & Vocational Digital Learning Platform',
    descriptor:
      'Making world-class STEM and vocational education accessible to every African learner — wherever they are.',
    challenge:
      'Quality STEM education remains out of reach for the majority of African youth. Geographic barriers, lack of equipment, and outdated curricula leave students disconnected from the skills the global economy demands.',
    whatWeDo: [
      'Online courses in STEM subjects and vocational trades, accessible via smartphone',
      'Interactive virtual labs and hands-on project-based learning',
      'Nationally and internationally recognized certifications with academic partners',
      'Employer partnerships that connect graduates directly to job placement opportunities',
    ],
    goal: "To reduce the skills gap between African graduates and employer needs — creating a talent pipeline that supports Africa's industrialization agenda and contributes to SDG 4 and SDG 9.",
  },
  {
    slug: 'climate-action',
    initiative: 'Initiative 03',
    title: 'Community-Based Climate Action & Renewable Energy',
    descriptor: 'Empowering African communities to lead the climate response — from the ground up.',
    challenge:
      'Africa contributes less than 4% of global carbon emissions, yet its communities face some of the most devastating impacts of climate change — droughts, floods, food insecurity, and displacement. Local action must be accelerated.',
    whatWeDo: [
      'Climate-smart agriculture training and demonstration projects for smallholder farmers',
      'Renewable energy installations — solar, wind, and biogas — for underserved communities',
      'Reforestation and land restoration programs led by youth volunteers',
      'Community-driven environmental awareness campaigns and youth climate advocacy',
    ],
    goal: 'To equip communities with clean energy access, resilient food systems, and a generation of young African climate champions — advancing SDG 7, SDG 13, and SDG 15.',
  },
  {
    slug: 'women-empowerment',
    initiative: 'Initiative 04',
    title: 'Women Empowerment through Digital Innovation & Mentorship',
    descriptor: 'When African women rise, Africa rises. We are committed to making that happen.',
    challenge:
      'Women across Africa face compounding barriers: limited access to technology, restricted financial resources, cultural gatekeeping, and a shortage of female mentors in STEM and business. Closing this gap is not optional — it is essential.',
    whatWeDo: [
      'Digital entrepreneurship training and financial literacy programs tailored for women',
      'Business incubation and startup support for women-led ventures',
      'One-on-one and group leadership development and mentorship programs',
      'Access to microfinance, investor networks, and professional development opportunities',
    ],
    goal: 'To elevate women’s economic and social status — building a generation of empowered African women who lead companies, communities, and countries — advancing SDG 5 and SDG 10.',
  },
];

export const findProgram = (slug: string): ProgramContent | undefined =>
  PROGRAMS.find((program) => program.slug === slug);
