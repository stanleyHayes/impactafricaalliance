import 'reflect-metadata';
import 'dotenv/config';

import crypto from 'crypto';

import {
  ContentStatus,
  DonationFrequency,
  DonationStatus,
  JobType,
  type MediaAsset,
  PaymentProvider,
  ROLE_TEMPLATES,
  SubmissionStatus,
  SubmissionType,
  UserRole,
} from '@iaa/shared';

import { loadConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './db/mongoose.js';
import { PasswordService } from './modules/auth/password.service.js';
import { ArticleModel } from './modules/content/models/article.model.js';
import { JobModel } from './modules/content/models/job.model.js';
import { PageSettingModel } from './modules/content/models/page-setting.model.js';
import { PartnerModel } from './modules/content/models/partner.model.js';
import { ReportModel } from './modules/content/models/report.model.js';
import { ImpactStatModel } from './modules/content/models/stat.model.js';
import { StoryModel } from './modules/content/models/story.model.js';
import { TeamMemberModel } from './modules/content/models/team.model.js';
import { DonationModel } from './modules/payments/donation.model.js';
import { SiteSettingModel } from './modules/site-settings/site-setting.model.js';
import { SubmissionModel, SubscriberModel } from './modules/submissions/submission.model.js';
import { UserModel } from './modules/users/user.model.js';

const EDITORS = [
  { name: 'Ama Boateng', email: 'ama.editor@impactafricaalliance.org' },
  { name: 'Tunde Bello', email: 'tunde.editor@impactafricaalliance.org' },
  { name: 'Lerato Khumalo', email: 'lerato.editor@impactafricaalliance.org' },
];

const PAGE_SETTINGS = [
  {
    pageKey: 'home',
    seoTitle: 'Empowering Youth, Women & Communities Across Africa',
    seoDescription: 'Impact Africa Alliance equips youth, women, and communities across Africa with the skills, tools, and opportunities to build a prosperous and equitable future.',
    heroEyebrow: 'Impact Africa Alliance',
    heroTitle: 'Empowering Africa, one community at a time.',
    heroSubtitle: 'We equip youth, women, and communities with practical skills, trusted partnerships, and opportunities to build a prosperous and equitable future.',
    introEyebrow: 'What We Do',
    introTitle: 'Four Transformative Initiatives',
    introBody: 'One mission: a prosperous, inclusive Africa.',
  },
  {
    pageKey: 'about',
    seoTitle: 'About Us — Our Mission, Vision & Team',
    seoDescription: 'Impact Africa Alliance is a purpose-driven, Pan-African organization committed to sustainable development and transformative change across Africa.',
    heroEyebrow: 'About Impact Africa Alliance',
    heroTitle: 'Purpose-driven. Pan-African. Built to last.',
    heroSubtitle: "We equip youth, women, and communities with the skills, partnerships, and opportunities to shape Africa's future from the inside out.",
  },
  {
    pageKey: 'our-work',
    seoTitle: 'Our Programs — Digital Skills, STEM, Climate, Women Empowerment',
    seoDescription: 'Four flagship initiatives forming an integrated ecosystem of change across Africa.',
    heroEyebrow: 'What We Do',
    heroTitle: 'Our Work',
    heroSubtitle: 'Four flagship initiatives. One transformative mission.',
    introBody: "IAA's work is organized around four interconnected pillars, each addressing a critical gap in Africa's development landscape.",
  },
  {
    pageKey: 'impact',
    seoTitle: 'Our Impact — Transforming Lives Across West Africa',
    seoDescription: "How Impact Africa Alliance contributes to the UN Sustainable Development Goals and the African Union's Agenda 2063.",
    heroEyebrow: 'Our Reach',
    heroTitle: 'Our Impact',
    heroSubtitle: 'Numbers tell part of the story. People tell the rest.',
  },
  {
    pageKey: 'get-involved',
    seoTitle: 'Get Involved — Partner, Volunteer, or Donate',
    seoDescription: "There are many ways to be part of Africa's transformation. Partner with us, volunteer, donate, or join our team.",
    heroEyebrow: 'Take Action',
    heroTitle: 'Get Involved',
    heroSubtitle: "There are many ways to be part of Africa's transformation. Find yours.",
  },
  {
    pageKey: 'contact',
    seoTitle: 'Contact Us',
    seoDescription: "Reach out to Impact Africa Alliance and let's build something impactful together.",
    heroEyebrow: 'Start a conversation',
    heroTitle: "Let's build something meaningful together.",
    heroSubtitle: 'Whether you have a question, an idea, or an opportunity to collaborate, our team is ready to listen.',
  },
  {
    pageKey: 'resources',
    seoTitle: 'Resources',
    seoDescription: 'Explore IAA resources: blog articles, research and reports, media kit, newsletters, and upcoming events.',
    heroEyebrow: 'Resources',
    heroTitle: 'Knowledge, stories, and tools for impact.',
    heroSubtitle: 'Explore our latest thinking, download reports, access media assets, and stay up to date with events across the Alliance.',
  },
  {
    pageKey: 'events',
    seoTitle: 'Events',
    seoDescription: 'Webinars, cohort launches, partner forums and community events from Impact Africa Alliance.',
    heroEyebrow: 'Events',
    heroTitle: 'Events across the Alliance',
    heroSubtitle: 'Webinars, cohort launches, partner forums and community gatherings. Find what is coming up and revisit past events.',
  },
  ...['news', 'privacy-policy', 'cookie-policy', 'terms-of-use', 'privacy-request'].map((pageKey) => ({
    pageKey,
    status: ContentStatus.Published,
  })),
].map((setting) => ({ ...setting, status: ContentStatus.Published }));

const generatePassword = (): string => {
  const bytes = crypto.randomBytes(16);
  return bytes.toString('base64url').slice(0, 22);
};

/** Deterministic placeholder image (Cloudinary-shaped MediaAsset for seed data). */
const media = (seed: string, w = 1200, h = 800): MediaAsset => ({
  url: `https://picsum.photos/seed/iaa-${seed}/${w}/${h}`,
  publicId: `iaa/seed/${seed}`,
  width: w,
  height: h,
  alt: '',
});

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const ARTICLES = [
  {
    title: 'Launching the 2025 Digital Skills Cohort across five countries',
    slug: 'launching-2025-digital-skills-cohort',
    excerpt:
      'Over 400 young Africans begin a six-month journey into software, data, and product design.',
    body: `## A continent-spanning cohort

Impact Africa Alliance today welcomed its **largest-ever Digital Skills cohort**, spanning Ghana, Kenya, Nigeria, Rwanda, and South Africa. The programme pairs intensive technical training with mentorship from industry practitioners.

> "We are building the talent pipeline the continent needs," said the programme lead.

Graduates join a growing alumni network of more than **1,000 young technologists**.`,
    tags: ['programs', 'digital-skills', 'announcement'],
    status: ContentStatus.Published,
    publishedAt: daysAgo(6),
    coverImage: media('article-cohort'),
  },
  {
    title: 'How mentorship changed Amara’s career trajectory',
    slug: 'how-mentorship-changed-amaras-career',
    excerpt: 'A reflection on the power of one-to-one guidance in early-career growth.',
    body: `When Amara joined our programme she had never written a line of code. Eighteen months later she **leads a small engineering team in Accra**.

Her story is one of many that show how structured mentorship multiplies the impact of training.`,
    tags: ['stories', 'mentorship'],
    status: ContentStatus.Published,
    publishedAt: daysAgo(15),
    coverImage: media('article-mentorship'),
  },
  {
    title: 'Partnering with local universities to expand access',
    slug: 'partnering-with-local-universities',
    excerpt: 'New memoranda of understanding bring our curriculum to three campuses.',
    body: `We are delighted to announce partnerships that embed our practical, project-based curriculum directly into university programmes.

- Three partner campuses
- Credit-bearing coursework
- A shared mentorship pool`,
    tags: ['partnerships', 'education'],
    status: ContentStatus.Published,
    publishedAt: daysAgo(28),
    coverImage: media('article-universities'),
  },
  {
    title: 'Field notes: building climate resilience with youth innovators',
    slug: 'field-notes-climate-resilience',
    excerpt: 'Highlights from our climate innovation lab in the Rift Valley.',
    body: `Twenty teams spent the week prototyping solutions for **water access** and **regenerative agriculture** in the Rift Valley.`,
    tags: ['climate', 'innovation'],
    status: ContentStatus.Draft,
    coverImage: media('article-climate'),
  },
  {
    title: 'Annual gathering 2025: a recap',
    slug: 'annual-gathering-2025-recap',
    excerpt: 'Founders, fellows, and funders convened in Nairobi for three days of learning.',
    body: `Our flagship convening brought together the founders, fellows, and funders powering the Alliance for three days of learning in Nairobi.`,
    tags: ['events', 'community'],
    status: ContentStatus.Draft,
  },
  {
    title: 'Why we measure outcomes, not outputs',
    slug: 'why-we-measure-outcomes-not-outputs',
    excerpt: 'A look inside our monitoring, evaluation, and learning practice.',
    body: `Counting workshops is easy. Measuring whether lives changed is harder — and far more important.

We track outcomes against three questions:

1. Did skills improve?
2. Did livelihoods change?
3. Did the change last?`,
    tags: ['impact', 'mel'],
    status: ContentStatus.Published,
    publishedAt: daysAgo(2),
    coverImage: media('article-mel'),
  },
];

const STORIES = [
  {
    name: 'Amara Okeke',
    slug: 'amara-okeke',
    country: 'Nigeria',
    program: 'Digital Skills',
    quote: 'The programme gave me the confidence and the skills to lead.',
    narrative:
      'Amara joined as a complete beginner and now **leads an engineering team** building fintech products in Lagos.',
    featured: true,
    status: ContentStatus.Published,
    order: 1,
    photo: media('story-amara', 800, 800),
  },
  {
    name: 'Kwame Mensah',
    slug: 'kwame-mensah',
    country: 'Ghana',
    program: 'Entrepreneurship',
    quote: 'I turned an idea in a notebook into a business that employs twelve people.',
    narrative: 'Kwame’s agri-logistics startup now serves smallholder farmers across the Ashanti region.',
    featured: true,
    status: ContentStatus.Published,
    order: 2,
    photo: media('story-kwame', 800, 800),
  },
  {
    name: 'Aisha Diallo',
    slug: 'aisha-diallo',
    country: 'Senegal',
    program: 'Leadership',
    quote: 'Leadership is service. The Alliance taught me to lead with humility.',
    narrative: 'Aisha founded a community organisation supporting girls’ education in Dakar.',
    featured: false,
    status: ContentStatus.Published,
    order: 3,
    photo: media('story-aisha', 800, 800),
  },
  {
    name: 'Brian Kipchoge',
    slug: 'brian-kipchoge',
    country: 'Kenya',
    program: 'Climate Innovation',
    quote: 'We are building solutions for our communities, by our communities.',
    narrative: 'Brian’s team designed a low-cost water filtration system now used in three counties.',
    featured: false,
    status: ContentStatus.Draft,
    order: 4,
    photo: media('story-brian', 800, 800),
  },
];

const TEAM = [
  {
    name: 'Dr. Naledi Mokoena',
    role: 'Executive Director',
    bio: 'Two decades leading youth development and education programmes across the continent.',
    linkedInUrl: 'https://www.linkedin.com/in/example-naledi',
    order: 1,
    isActive: true,
    photo: media('team-naledi', 600, 600),
  },
  {
    name: 'Samuel Adeyemi',
    role: 'Director of Programmes',
    bio: 'Designs and scales the Alliance’s flagship training programmes.',
    linkedInUrl: 'https://www.linkedin.com/in/example-samuel',
    order: 2,
    isActive: true,
    photo: media('team-samuel', 600, 600),
  },
  {
    name: 'Grace Wanjiru',
    role: 'Head of Partnerships',
    bio: 'Builds the relationships that fund and extend our work.',
    order: 3,
    isActive: true,
    photo: media('team-grace', 600, 600),
  },
  {
    name: 'Prof. Emmanuel Bance',
    role: 'Advisory Board Chair',
    bio: 'Economist and long-time champion of pan-African education.',
    order: 4,
    isActive: true,
    photo: media('team-emmanuel', 600, 600),
  },
  {
    name: 'Fatou Sow',
    role: 'Country Lead — Senegal',
    bio: 'Leads programme delivery and community engagement in West Africa.',
    order: 5,
    isActive: true,
    photo: media('team-fatou', 600, 600),
  },
  {
    name: 'David Otieno',
    role: 'Country Lead — Kenya',
    bio: 'Oversees East Africa operations and the Nairobi innovation lab.',
    order: 6,
    isActive: true,
    photo: media('team-david', 600, 600),
  },
];

const PARTNERS = [
  { name: 'Mastercard Foundation', logo: media('partner-mcf', 400, 200), websiteUrl: 'https://mastercardfdn.org', order: 1, isActive: true },
  { name: 'African Development Bank', logo: media('partner-afdb', 400, 200), websiteUrl: 'https://www.afdb.org', order: 2, isActive: true },
  { name: 'Google.org', logo: media('partner-google', 400, 200), websiteUrl: 'https://google.org', order: 3, isActive: true },
  { name: 'Tony Elumelu Foundation', logo: media('partner-tef', 400, 200), websiteUrl: 'https://www.tonyelumelufoundation.org', order: 4, isActive: true },
  { name: 'UNICEF', logo: media('partner-unicef', 400, 200), websiteUrl: 'https://www.unicef.org', order: 5, isActive: true },
  { name: 'Microsoft Philanthropies', logo: media('partner-microsoft', 400, 200), websiteUrl: 'https://www.microsoft.com/philanthropies', order: 6, isActive: false },
];

const REPORTS = [
  { title: 'Annual Impact Report 2024', description: 'A full account of our reach, outcomes, and finances.', year: 2024, file: media('report-2024'), status: ContentStatus.Published, order: 1 },
  { title: 'Annual Impact Report 2023', description: 'Our work across programmes and partnerships in 2023.', year: 2023, file: media('report-2023'), status: ContentStatus.Published, order: 2 },
  { title: 'Digital Skills Outcomes Study', description: 'An independent evaluation of employment outcomes.', year: 2024, file: media('report-skills'), status: ContentStatus.Published, order: 3 },
  { title: 'Strategy 2025–2028 (Draft)', description: 'Our forward strategy, currently in consultation.', year: 2025, file: media('report-strategy'), status: ContentStatus.Draft, order: 4 },
];

const JOBS = [
  { title: 'Programme Manager — Digital Skills', slug: 'programme-manager-digital-skills', location: 'Accra, Ghana', type: JobType.FullTime, description: 'Lead the delivery of our flagship **Digital Skills** programme across multiple cohorts.', applyUrl: 'https://example.org/apply/pm-digital', deadline: daysAgo(-21), status: ContentStatus.Published },
  { title: 'Monitoring & Evaluation Officer', slug: 'monitoring-evaluation-officer', location: 'Nairobi, Kenya', type: JobType.FullTime, description: 'Build and run our **monitoring, evaluation, and learning** systems to measure outcomes that matter.', applyUrl: 'https://example.org/apply/mel', deadline: daysAgo(-14), status: ContentStatus.Published },
  { title: 'Communications Fellow', slug: 'communications-fellow', location: 'Remote', type: JobType.Fellowship, description: 'Tell the stories of our community across channels for a six-month fellowship.', deadline: daysAgo(-30), status: ContentStatus.Published },
  { title: 'Frontend Engineering Intern', slug: 'frontend-engineering-intern', location: 'Lagos, Nigeria', type: JobType.Internship, description: 'Support the team building our digital products and learning platform.', status: ContentStatus.Published },
  { title: 'Partnerships Lead — Francophone Africa', slug: 'partnerships-lead-francophone', location: 'Dakar, Senegal', type: JobType.FullTime, description: 'Grow our partner network across French-speaking African markets.', status: ContentStatus.Draft },
];

const STATS = [
  { key: 'youth-trained', label: 'Young people trained', value: 1200, suffix: '+', order: 1, isActive: true },
  { key: 'countries', label: 'Countries reached', value: 5, suffix: '', order: 2, isActive: true },
  { key: 'programs', label: 'Flagship programmes', value: 4, suffix: '', order: 3, isActive: true },
  { key: 'partners', label: 'Active partners', value: 18, suffix: '+', order: 4, isActive: true },
  { key: 'employment-rate', label: 'Graduate employment rate', value: 78, suffix: '%', order: 5, isActive: true },
  { key: 'mentors', label: 'Volunteer mentors', value: 250, suffix: '+', order: 6, isActive: false },
];

const SUBSCRIBERS = [
  { email: 'thabo.nkosi@example.com', name: 'Thabo Nkosi', source: 'footer', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'lucy.achieng@example.com', name: 'Lucy Achieng', source: 'blog', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'ibrahim.toure@example.com', name: 'Ibrahim Touré', source: 'footer', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'chiamaka.eze@example.com', name: 'Chiamaka Eze', source: 'event', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'sipho.dlamini@example.com', name: 'Sipho Dlamini', source: 'footer', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'aminata.bah@example.com', name: 'Aminata Bah', source: 'blog', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'joseph.mwangi@example.com', name: 'Joseph Mwangi', source: 'footer', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'nadia.benali@example.com', name: 'Nadia Benali', source: 'donate', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'kofi.asante@example.com', name: 'Kofi Asante', source: 'footer', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'zainab.suleiman@example.com', name: 'Zainab Suleiman', source: 'event', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'tendai.moyo@example.com', name: 'Tendai Moyo', source: 'footer', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
  { email: 'awa.ndiaye@example.com', name: 'Awa Ndiaye', source: 'blog', consent: true, consentVersion: '2026-07', consentedAt: new Date() },
];

const SUBMISSIONS = [
  { type: SubmissionType.Contact, status: SubmissionStatus.New, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, name: 'Olivia Mensah', email: 'olivia.mensah@example.com', subject: 'Speaking opportunity', message: 'I’d love to invite your director to speak at our conference.' } },
  { type: SubmissionType.Volunteer, status: SubmissionStatus.New, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, name: 'Daniel Okafor', email: 'daniel.okafor@example.com', expertise: 'Software mentorship', availability: 'Weekends' } },
  { type: SubmissionType.Partner, status: SubmissionStatus.New, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, organizationName: 'BrightFuture Foundation', email: 'partners@brightfuture.org', partnershipInterest: 'Co-funding a cohort' } },
  { type: SubmissionType.Contact, status: SubmissionStatus.New, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, name: 'Maria Santos', email: 'maria.santos@example.com', subject: 'Media enquiry', message: 'Writing a feature on African edtech — can we talk?' } },
  { type: SubmissionType.Volunteer, status: SubmissionStatus.New, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, name: 'Peter Banda', email: 'peter.banda@example.com', expertise: 'Curriculum design' } },
  { type: SubmissionType.Contact, status: SubmissionStatus.Read, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, name: 'Grace Owusu', email: 'grace.owusu@example.com', subject: 'Thank you', message: 'Your programme changed my niece’s life.' } },
  { type: SubmissionType.Partner, status: SubmissionStatus.Read, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, organizationName: 'TechBridge Africa', email: 'hello@techbridge.africa', partnershipInterest: 'Providing laptops' } },
  { type: SubmissionType.Volunteer, status: SubmissionStatus.Read, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, name: 'Sarah Kimani', email: 'sarah.kimani@example.com', expertise: 'UX design mentorship' } },
  { type: SubmissionType.Contact, status: SubmissionStatus.Archived, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, name: 'John Doe', email: 'john.doe@example.com', subject: 'General', message: 'Keep up the great work!' } },
  { type: SubmissionType.Partner, status: SubmissionStatus.Archived, consent: true, consentVersion: '2026-07', consentedAt: new Date(), payload: { __seed: true, organizationName: 'Old Sponsor Ltd', email: 'contact@oldsponsor.com', partnershipInterest: 'Past sponsor reconnecting' } },
];

const DONATIONS = [
  { provider: PaymentProvider.Stripe, reference: 'seed_don_0001', amountUsd: 250, frequency: DonationFrequency.OneTime, status: DonationStatus.Succeeded, donorName: 'Helen Carter', donorEmail: 'helen.carter@example.com' },
  { provider: PaymentProvider.Paystack, reference: 'seed_don_0002', amountUsd: 50, frequency: DonationFrequency.Monthly, status: DonationStatus.Succeeded, donorName: 'Yusuf Abubakar', donorEmail: 'yusuf.abubakar@example.com' },
  { provider: PaymentProvider.Stripe, reference: 'seed_don_0003', amountUsd: 1000, frequency: DonationFrequency.OneTime, status: DonationStatus.Succeeded, donorName: 'The Adeyemi Family', donorEmail: 'giving@adeyemi.example.com' },
  { provider: PaymentProvider.Stripe, reference: 'seed_don_0004', amountUsd: 25, frequency: DonationFrequency.Monthly, status: DonationStatus.Succeeded, donorName: 'Linda Park', donorEmail: 'linda.park@example.com' },
  { provider: PaymentProvider.Paystack, reference: 'seed_don_0005', amountUsd: 500, frequency: DonationFrequency.OneTime, status: DonationStatus.Succeeded, donorName: 'Chukwu Okonkwo', donorEmail: 'chukwu.okonkwo@example.com' },
  { provider: PaymentProvider.Stripe, reference: 'seed_don_0006', amountUsd: 75, frequency: DonationFrequency.OneTime, status: DonationStatus.Pending, donorName: 'Anonymous', donorEmail: 'anon1@example.com' },
  { provider: PaymentProvider.Paystack, reference: 'seed_don_0007', amountUsd: 120, frequency: DonationFrequency.Monthly, status: DonationStatus.Pending, donorName: 'Marcus Reid', donorEmail: 'marcus.reid@example.com' },
  { provider: PaymentProvider.Stripe, reference: 'seed_don_0008', amountUsd: 40, frequency: DonationFrequency.OneTime, status: DonationStatus.Failed, donorName: 'Test Donor', donorEmail: 'failed@example.com' },
  { provider: PaymentProvider.Stripe, reference: 'seed_don_0009', amountUsd: 300, frequency: DonationFrequency.OneTime, status: DonationStatus.Succeeded, donorName: 'Beatrice Mwale', donorEmail: 'beatrice.mwale@example.com' },
  { provider: PaymentProvider.Paystack, reference: 'seed_don_0010', amountUsd: 10, frequency: DonationFrequency.Monthly, status: DonationStatus.Succeeded, donorName: 'Kelvin Osei', donorEmail: 'kelvin.osei@example.com' },
  { provider: PaymentProvider.Stripe, reference: 'seed_don_0011', amountUsd: 2000, frequency: DonationFrequency.OneTime, status: DonationStatus.Succeeded, donorName: 'Foundation X', donorEmail: 'grants@foundationx.example.com' },
  { provider: PaymentProvider.Paystack, reference: 'seed_don_0012', amountUsd: 60, frequency: DonationFrequency.OneTime, status: DonationStatus.Failed, donorName: 'Retry Later', donorEmail: 'retry@example.com' },
];


/** Seed the database with an admin plus rich demo content across every collection. */
const seed = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger(config.env);
  await connectDatabase(config, logger);

  const passwords = new PasswordService();

  const ensure = async (label: string, count: number, insert: () => Promise<unknown>): Promise<void> => {
    if (count > 0) {
      logger.info(`${label}: ${count} existing — skipped`);
      return;
    }
    await insert();
    logger.info(`${label}: seeded`);
  };

  const upsertBySlug = async (
    label: string,
    docs: ReadonlyArray<{ slug: string }>,
    upsertOne: (doc: { slug: string }) => Promise<unknown>,
  ): Promise<void> => {
    for (const doc of docs) {
      await upsertOne(doc);
    }
    logger.info(`${label}: upserted ${docs.length} (content refreshed)`);
  };

  try {
    // Admin (idempotent by email).
    const existingAdmin = await UserModel.findOne({ email: config.seedAdmin.email }).exec();
    if (existingAdmin) {
      logger.info(`Admin ${config.seedAdmin.email} already exists`);
    } else {
      await UserModel.create({
        name: config.seedAdmin.name,
        email: config.seedAdmin.email,
        passwordHash: await passwords.hash(config.seedAdmin.password),
        role: UserRole.Admin,
        permissions: ROLE_TEMPLATES[UserRole.Admin],
      });
      logger.info(`Seeded admin user ${config.seedAdmin.email}`);
    }

    // Editor users (idempotent by email).
    const editorPassword = config.seedEditorPassword ?? generatePassword();
    for (const editor of EDITORS) {
      const exists = await UserModel.findOne({ email: editor.email }).exec();
      if (exists) {
        continue;
      }
      await UserModel.create({
        name: editor.name,
        email: editor.email,
        passwordHash: await passwords.hash(editorPassword),
        role: UserRole.Editor,
        permissions: ROLE_TEMPLATES[UserRole.Editor],
      });
      logger.info(`Seeded editor ${editor.email}`);
    }
    if (!config.seedEditorPassword) {
      logger.info(
        'Generated editor password. Set SEED_EDITOR_PASSWORD to avoid rotation. The password is only printed to stdout below.',
      );
      // eslint-disable-next-line no-console
      console.log(`SEED_EDITOR_PASSWORD=${editorPassword}`);
    }

    await upsertBySlug('Articles', ARTICLES, (doc) =>
      ArticleModel.updateOne({ slug: doc.slug }, { $set: doc }, { upsert: true }).exec(),
    );
    await upsertBySlug('Stories', STORIES, (doc) =>
      StoryModel.updateOne({ slug: doc.slug }, { $set: doc }, { upsert: true }).exec(),
    );
    await ensure('Team', await TeamMemberModel.countDocuments().exec(), () => TeamMemberModel.create(TEAM));
    await ensure('Partners', await PartnerModel.countDocuments().exec(), () => PartnerModel.create(PARTNERS));
    await ensure('Reports', await ReportModel.countDocuments().exec(), () => ReportModel.create(REPORTS));
    await upsertBySlug('Jobs', JOBS, (doc) =>
      JobModel.updateOne({ slug: doc.slug }, { $set: doc }, { upsert: true }).exec(),
    );
    await ensure('Impact stats', await ImpactStatModel.countDocuments().exec(), () => ImpactStatModel.create(STATS));
    await ensure('Page settings', await PageSettingModel.countDocuments().exec(), () => PageSettingModel.create(PAGE_SETTINGS));
    await ensure('Subscribers', await SubscriberModel.countDocuments().exec(), () => SubscriberModel.create(SUBSCRIBERS));
    await ensure('Submissions', await SubmissionModel.countDocuments().exec(), () => SubmissionModel.create(SUBMISSIONS));

    const existingSiteSettings = await SiteSettingModel.countDocuments().exec();
    if (existingSiteSettings > 0) {
      logger.info('Site settings: existing — skipped');
    } else {
      await SiteSettingModel.create({
        key: 'site',
        siteName: 'Impact Africa Alliance',
        tagline: 'Empowering African youth through education, skills, and opportunity.',
        contactEmail: 'hello@impactafricaalliance.org',
        contactPhone: '+233 20 000 0000',
        addressLine1: '123 Independence Avenue',
        city: 'Accra',
        region: 'Greater Accra',
        country: 'Ghana',
        announcement: {
          enabled: true,
          message:
            'IAA OFFICIAL LAUNCH — 8TH OCTOBER 2026 | GOOGLE COMMUNITY CENTRE, ACCRA. Supported by Google Africa.',
        },
      });
      logger.info('Site settings: seeded');
    }

    await ensure('Donations', await DonationModel.countDocuments().exec(), () => DonationModel.create(DONATIONS));

    logger.info('Seed complete');
  } finally {
    await disconnectDatabase();
  }
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
