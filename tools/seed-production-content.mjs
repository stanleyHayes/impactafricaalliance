#!/usr/bin/env node
/**
 * Publish the organisation's real content to a live database.
 *
 * This is NOT the demo seeder. It writes only content from the September
 * website review — the mentorship webinars, the office addresses, the team
 * roster, and the launch announcement — and never the sample articles,
 * partners, donations or users that `wipe-seeded-data.mjs` was written to
 * remove.
 *
 * Purely additive and idempotent: it skips any collection that already has
 * documents, and only fills site-settings fields that are currently empty.
 * It never deletes or overwrites.
 *
 * DRY-RUN by default. Pass --confirm to write.
 *
 * Usage (from repo root):
 *   node tools/seed-production-content.mjs                       # dry-run vs production
 *   node tools/seed-production-content.mjs --env apps/api/.env   # dry-run vs another env
 *   node tools/seed-production-content.mjs --confirm             # apply
 *   node tools/seed-production-content.mjs --only events --confirm
 */
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import process from 'node:process';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlag = args.indexOf('--env');
const envFile = envFlag !== -1 ? args[envFlag + 1] : 'apps/api/.env.production';
const onlyFlag = args.indexOf('--only');
const only = onlyFlag !== -1 ? args[onlyFlag + 1] : null;

loadEnv({ path: envFile });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error(`MONGODB_URI not found (env file: ${envFile})`);
  process.exit(1);
}

const at = (iso) => new Date(iso);

const EVENTS = [
  {
    title: 'Leveraging AI to Accelerate Your Career',
    description:
      'AI is transforming how we learn, work, create, and build careers. The question is no longer whether AI will change the workplace; it is how you will use it to your advantage. A practical mentorship session on becoming more productive, competitive, and future-ready — covering the tools that boost your productivity, how to learn new skills faster, emerging AI career opportunities, and how to become an AI-ready professional.',
    startAt: at('2026-09-08T17:00:00.000Z'),
    location: 'Online',
    type: 'webinar',
    status: 'published',
    host: 'Joshua Opoku Agyemang',
    hostTitle: 'President, Ghana STEM Network & IoT Africa',
    admission: 'FREE',
    registrationEnabled: true,
    questions: [
      {
        id: 'ai-usage',
        label: 'How often do you use AI tools today?',
        type: 'single-choice',
        options: ['Never', 'Occasionally', 'Weekly', 'Every day'],
        required: false,
      },
    ],
  },
  {
    title: 'Scaling Your Business in West Africa: What Investors Are Demanding',
    description:
      'What does it take to move from operating in one market to building a scalable, investment-ready regional business? An insightful session exploring what investors look for when assessing businesses seeking to scale across West Africa — growth potential, business models, traction, leadership, market opportunity, and regional expansion.',
    startAt: at('2026-09-11T17:00:00.000Z'),
    location: 'Online',
    type: 'webinar',
    status: 'published',
    hostTitle: 'Philanthropy, Partnerships & Ecosystem Leader',
    admission: 'FREE',
    registrationEnabled: true,
    questions: [
      {
        id: 'stage',
        label: 'Where is your business today?',
        type: 'single-choice',
        options: ['Just an idea', 'Pre-revenue', 'Generating revenue', 'Ready to expand'],
        required: false,
      },
    ],
  },
  {
    title: '“Ready for Work”: How to Land Your Dream Job in 60 Days',
    description:
      'The job market is changing, and having a degree is no longer enough. You need the right skills, mindset, strategy, and tools to stand out and get hired. A practical session on positioning yourself for the jobs you actually want, the skills employers look for, using AI to supercharge your search, improving your CV and LinkedIn, preparing for interviews, and a 60-day strategy for moving from job seeker to job offer.',
    startAt: at('2026-09-18T17:00:00.000Z'),
    location: 'Online',
    type: 'webinar',
    status: 'published',
    host: 'Tom-Chris Emewulu',
    hostTitle: 'Founder, Stars From All Nations (Nasdaq Milestone Maker) | AI Careers Coach',
    admission: 'FREE',
    registrationEnabled: true,
    questions: [
      {
        id: 'search-status',
        label: 'Where are you in your job search?',
        type: 'single-choice',
        options: ['Still studying', 'Recent graduate', 'Actively applying', 'Employed, exploring options'],
        required: false,
      },
    ],
  },
  {
    title: 'Scholarships, Fellowships & Global Opportunities for Young People',
    description:
      'What if the opportunity you need to advance your education, career, or impact is already out there, but you simply do not know where to find it or how to apply? A session on navigating scholarships and opportunities — where to find credible programmes, how to identify ones that match your profile, how to build a competitive application, the mistakes that hold applicants back, and how to prepare for global programmes.',
    startAt: at('2026-09-25T17:00:00.000Z'),
    location: 'Online',
    type: 'webinar',
    status: 'published',
    host: 'Aliyu Umar Sadiq',
    hostTitle: 'Circular Economy & E-waste Researcher | Erasmus Scholar | International Development',
    admission: 'FREE',
    registrationEnabled: true,
    questions: [
      {
        id: 'interest',
        label: 'What are you most interested in?',
        type: 'multi-choice',
        options: ['Scholarships', 'Fellowships', 'Research funding', 'Exchange programmes'],
        required: false,
      },
    ],
  },
];

const TEAM = [
  {
    name: 'Emmanuel Mbansi',
    role: 'President',
    tier: 'executive',
    order: 1,
    isActive: true,
  },
  {
    name: 'Rahmah Mohammed',
    role: 'Country Director, Nigeria',
    tier: 'executive',
    bio: 'Rahmatu is an International Relations professional, emerging African leader, and advocate for inclusive development, with over four years of experience working across protection monitoring, women\'s empowerment, gender equality, child health advocacy, and youth development.\n\nShe contributes to initiatives that promote leadership, social impact, youth empowerment, and sustainable development across Africa. Through her leadership, she is passionate about creating platforms that equip young people with the knowledge, confidence, and opportunities to become meaningful contributors to their communities and the continent.\n\nRahmatu is also pursuing a Master\'s degree in International Relations, building on her practical experience with a strong academic foundation in global affairs, diplomacy, development, and international cooperation. Her professional journey has given her firsthand insight into the realities faced by vulnerable populations and the importance of effective protection mechanisms in promoting safety, dignity, and resilience.\n\nA strong advocate for women\'s empowerment and gender equality, Rahmatu is committed to challenging barriers that limit opportunities and creating inclusive environments where women and girls can thrive. Her work in child health advocacy further reflects her commitment to improving access to opportunities and services that contribute to healthier and more promising futures for children.\n\nShe believes that Africa\'s greatest strength lies in its people, particularly its young generation, and is committed to contributing to a future driven by innovation, collaboration, inclusion, and responsible leadership. Her vision is to bridge the gap between policy, leadership, and community-level impact.',
    order: 2,
    isActive: true,
  },
  {
    name: 'Jemimah Opata',
    role: 'Country Director, Ghana',
    tier: 'executive',
    bio: 'Jemimah is a marketing, business development, and innovation professional with experience spanning strategic partnerships, corporate engagement, content strategy, and client relations. She is passionate about using AI, marketing, storytelling, and technology to help organizations identify opportunities, strengthen their brands, and achieve sustainable growth.\n\nHer interests lie particularly in African innovation, education, STEM, emerging technology, and the future of work. Jemimah is passionate about exploring how AI can move beyond content creation to solve practical business challenges in areas such as sales, marketing, research, partnerships, and workflow automation.\n\nWith a strong blend of strategic thinking and creativity, she brings a people-centered approach to building partnerships, developing ideas, and communicating impactful stories. She is committed to continuous learning and to contributing to an innovative African future shaped by technology, creativity, collaboration, and purpose.',
    order: 3,
    isActive: true,
  },
  {
    name: 'Stanley Hayford',
    role: 'Technical Director',
    tier: 'executive',
    bio: 'Stanley is a software engineer working across the full stack, building with Go, React, and Node.js. He leads the Alliance\'s technical work: the public website, the admin platform behind it, and the systems that keep programme data reliable.',
    order: 4,
    isActive: true,
  },
  {
    name: 'Khadija Ibrahim',
    role: 'Community Manager / HRM',
    tier: 'executive',
    bio: 'Khadija Ibrahim is a Nigerian lawyer and development professional with experience spanning legal practice, programme coordination, strategic communications, advocacy, and community engagement. She holds an LL.B from Bayero University Kano and was called to the Nigerian Bar in 2026.\n\nHer professional work reflects a strong interest in social justice, youth development, gender equality, governance, and sustainable development. She has contributed to various initiatives focused on empowering young people and communities, while leveraging communication and storytelling to amplify social impact.\n\nKhadija oversees media and communications while supporting community engagement, partnerships, and programme visibility across Nigeria and Ghana. She is passionate about using her legal knowledge, leadership, and communication skills to contribute to meaningful and sustainable change.',
    order: 5,
    isActive: true,
  },
  {
    name: 'Jeff Harrys',
    role: 'Social Media Manager',
    tier: 'executive',
    bio: 'Medical Laboratory Scientist, brand and content strategist. Harrys blends science, technology, and creativity to help brands tell their stories, grow their digital presence, and stand out.\n\nWith a background in Medical Laboratory Science and a passion for branding and content, he turns complex ideas into engaging visual stories that connect with people.',
    order: 6,
    isActive: true,
  },
  {
    name: 'Williams Sarfo',
    role: 'Public Relations & Marketing',
    tier: 'executive',
    bio: 'Public Relations and Marketing professional with expertise in brand development and graphic design. Passionate about strategic communication, creative direction, and building distinctive brands with lasting impact.',
    order: 7,
    isActive: true,
  },
  {
    name: 'Testimony',
    role: 'Graphic Designer',
    tier: 'executive',
    order: 8,
    isActive: true,
  },
  {
    name: 'Patrick Awuah Jr.',
    role: 'Board Chair',
    tier: 'board',
    order: 20,
    isActive: true,
  },
  {
    name: 'Mahad Mohammed',
    role: 'Board Member',
    tier: 'board',
    order: 21,
    isActive: true,
  },
  {
    name: 'Tom-Chris Emewulu',
    role: 'Board Member',
    tier: 'board',
    order: 22,
    isActive: true,
  },
  {
    name: 'Christina Maldonado',
    role: 'Board Member',
    tier: 'board',
    order: 23,
    isActive: true,
  },
  {
    name: 'Joshua Opoku Agyemang',
    role: 'Vice President, West Africa',
    tier: 'non-executive',
    order: 40,
    isActive: true,
  },
  {
    name: 'Kelvin Wright',
    role: 'Country Director, Liberia',
    tier: 'non-executive',
    order: 41,
    isActive: true,
  },
  {
    name: 'Aliyu Sadiq',
    role: 'Director of Diaspora Affairs (UK)',
    tier: 'non-executive',
    order: 42,
    isActive: true,
  },
  {
    name: 'Adnan Mundi',
    role: 'Non-Executive Team',
    tier: 'non-executive',
    order: 43,
    isActive: true,
  },
];

const OFFICES = [
  {
    label: 'Head Office',
    addressLine1: 'Atlantic Tower, Airport City',
    city: 'Accra',
    country: 'Ghana',
    isPrimary: true,
    order: 1,
    isActive: true,
  },
  {
    label: 'Nigeria Office',
    addressLine1: 'No. 69, Royal Anchor Estate, Kucigoro',
    addressLine2: 'Abuja Municipal Area Council (AMAC), FCT',
    city: 'Abuja',
    country: 'Nigeria',
    isPrimary: false,
    order: 2,
    isActive: true,
  },
];

const ANNOUNCEMENT = {
  enabled: true,
  message:
    'IAA OFFICIAL LAUNCH — 8TH OCTOBER 2026 | GOOGLE COMMUNITY CENTRE, ACCRA. Supported by Google Africa.',
};

const POPUP = {
  enabled: true,
  title: 'We launch on 8 October.',
  message:
    'Impact Africa Alliance goes live at the Google Community Centre in Accra, supported by Google Africa. Our mentorship webinars are open for registration now.',
  ctaLabel: 'See upcoming events',
  ctaUrl: 'https://www.impactafricaalliance.org/events',
  delaySeconds: 3,
};

const LIVE_CHAT = {
  enabled: true,
  label: 'Chat with us',
  greeting: "Hello Impact Africa Alliance, I'd like to ask about",
};

const wanted = (name) => !only || only === name;

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  const db = mongoose.connection.db;
  console.log(confirm ? 'MODE: CONFIRM — writes WILL be applied\n' : 'MODE: dry-run (pass --confirm to apply)\n');

  const seedCollection = async (name, collectionName, docs) => {
    if (!wanted(name)) return;
    const collection = db.collection(collectionName);
    const existing = await collection.countDocuments();
    if (existing > 0) {
      console.log(`${name}: ${existing} document(s) already present — skipped`);
      return;
    }
    if (confirm) {
      const now = new Date();
      await collection.insertMany(docs.map((d) => ({ ...d, createdAt: now, updatedAt: now })));
      console.log(`${name}: inserted ${docs.length}`);
    } else {
      console.log(`${name}: would insert ${docs.length}`);
      docs.forEach((d) => console.log(`   - ${d.title ?? d.label ?? d.name}`));
    }
  };

  await seedCollection('events', 'events', EVENTS);
  await seedCollection('offices', 'offices', OFFICES);

  if (wanted('team')) {
    const team = db.collection('teammembers');
    const existing = await team.countDocuments();
    if (existing > 0) {
      console.log(`team: ${existing} member(s) already present — skipped`);
    } else {
      if (confirm) {
        const now = new Date();
        await team.insertMany(TEAM.map((d) => ({ ...d, createdAt: now, updatedAt: now })));
        console.log(`team: inserted ${TEAM.length}`);
      } else {
        console.log(`team: would insert ${TEAM.length}`);
        TEAM.forEach((m) => console.log(`   - ${m.name} (${m.tier})`));
      }
    }
  }

  if (wanted('site-settings')) {
    const settings = db.collection('sitesettings');
    const doc = await settings.findOne({ key: 'site' });
    if (!doc) {
      console.log('site-settings: no document yet — open Site Settings in the dashboard once, then re-run');
    } else {
      const patch = {};
      if (!doc.announcement?.message) patch.announcement = ANNOUNCEMENT;
      if (!doc.popup?.message) patch.popup = POPUP;
      if (!doc.liveChat) patch.liveChat = LIVE_CHAT;
      const keys = Object.keys(patch);
      if (keys.length === 0) {
        console.log('site-settings: announcement, popup and live chat already set — skipped');
      } else if (confirm) {
        await settings.updateOne({ key: 'site' }, { $set: { ...patch, updatedAt: new Date() } });
        console.log(`site-settings: set ${keys.join(', ')}`);
      } else {
        console.log(`site-settings: would set ${keys.join(', ')}`);
      }
    }
  }

  console.log(confirm ? '\nDone.' : '\nDry-run complete. Re-run with --confirm to apply.');
};

run()
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
