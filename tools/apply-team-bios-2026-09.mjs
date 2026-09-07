#!/usr/bin/env node
/**
 * Apply the team biographies and titles supplied on 7 September 2026.
 *
 * Unlike apply-doc-team-updates.mjs, this REPLACES existing copy: these are
 * revised biographies people wrote for themselves, not gap-filling. It prints
 * what it would overwrite so the change can be checked before it is made.
 *
 * DRY-RUN by default. Pass --confirm to write.
 */
import process from 'node:process';

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlag = args.indexOf('--env');
loadEnv({ path: envFlag !== -1 ? args[envFlag + 1] : 'apps/api/.env.production' });

const uri = process.env.MONGODB_URI_DIRECT ?? process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found');
  process.exit(1);
}

const paragraphs = (...parts) => parts.join('\n\n');

const UPDATES = [
  {
    match: /^Emmanuel Mbansi/i,
    // Supersedes the review document's "change co-founder to President": the
    // title supplied on 7 September restores Co-Founder alongside it.
    role: 'Co-Founder & President',
    bio: paragraphs(
      'I build businesses that build people, and ecosystems that build nations.',
      "For over a decade across Africa and the UAE, I have led youth movements, built enterprises, and advised institutions on Africa's future. My journey has allowed me to mentor over 7,000 young leaders across the continent and mobilize over $1M towards STEM education, women empowerment, and real estate initiatives.",
      "I founded Impact Africa Alliance out of a deep conviction that Africa's greatest asset is its people, especially its youth. Our mission is to drive enterprise, leadership, and opportunity that transforms communities.",
      "I also serve as President of the ALIWA Youth Leadership Program Network, host of People Who Inspire, and Advisor to AU and UN Youth, shaping policy and programs for Africa's next generation.",
      'My commitment is simple: connect the diaspora to Africa, and connect young Africans to their potential.',
    ),
  },
  {
    match: /^Jemimah/i,
    role: 'Country Director, Ghana',
    bio: paragraphs(
      'Jemimah is a marketing, business development and innovation professional with experience in strategic partnerships, corporate engagement, content strategy and client relations.',
      'She is passionate about using AI, storytelling and technology to help organizations strengthen their brands, identify opportunities and achieve sustainable growth.',
      "At Impact Africa Alliance Ghana, she brings a blend of strategic thinking and creativity to lead partnerships, drive corporate engagement, and shape compelling narratives that amplify IAA's mission. Her focus is on building high-value collaborations, expanding IAA's footprint, and positioning Ghana as a hub for youth leadership, enterprise and innovation.",
      'Her interests in African innovation, STEM, education and the future of work align strongly with IAA’s vision of an Africa transformed by technology, creativity, collaboration and purpose.',
    ),
  },
  {
    match: /^Stanley Hayford/i,
    role: 'Technology Lead',
    bio: paragraphs(
      'Stanley is a Senior Software Engineer and technology entrepreneur with over 8 years of experience building scalable digital products and distributed systems across SaaS, enterprise software and consumer platforms.',
      'His expertise spans Go, microservices, event-driven architecture, cloud infrastructure, Next.js, React, TypeScript, Python, Kafka, Docker, Kubernetes and modern DevOps practices.',
      "At Impact Africa Alliance, Stanley leads all technology — building and managing the public website, the admin platform, and the systems that keep program data secure and reliable. He brings strong product thinking, system architecture and technical leadership to ensure IAA's digital infrastructure is scalable, efficient and built to support growth across the continent.",
    ),
  },
  {
    match: /khadija/i,
    role: 'Community Manager, Nigeria & Ghana',
    bio: paragraphs(
      'Khadija is a Nigerian lawyer and development professional with experience in legal practice, programme coordination, strategic communications, advocacy and community engagement. She holds an LL.B from Bayero University Kano and was called to the Nigerian Bar in 2026.',
      "At Impact Africa Alliance, she oversees media and communications, while leading community engagement, partnerships and program visibility across Nigeria and Ghana. She drives content, manages our community, supports human resources, and ensures IAA's stories and impact are communicated clearly and consistently.",
      'Passionate about social justice, youth development, gender equality and sustainable development, she brings her legal background, leadership and communication skills to advance meaningful and lasting change.',
    ),
  },
  {
    // Moves up from the non-executive list; his title is unchanged.
    match: /^Joshua Opoku/i,
    tier: 'executive',
  },
];

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20_000 });
  const team = mongoose.connection.db.collection('teammembers');
  console.log(confirm ? 'MODE: CONFIRM\n' : 'MODE: dry-run (pass --confirm)\n');

  for (const { match, ...fields } of UPDATES) {
    const found = await team.find({ name: { $regex: match } }).toArray();
    if (found.length !== 1) {
      console.log(`SKIP ${match}: matched ${found.length} records`);
      continue;
    }
    const [member] = found;
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([key, value]) => member[key] !== value),
    );
    if (Object.keys(changes).length === 0) {
      console.log(`${member.name}: already current`);
      continue;
    }
    console.log(member.name);
    for (const [key, value] of Object.entries(changes)) {
      const before = key === 'bio' ? `${String(member[key] ?? '').length} chars` : member[key];
      const after = key === 'bio' ? `${String(value).length} chars` : value;
      console.log(`  ${key}: ${before} -> ${after}`);
    }
    if (confirm) {
      await team.updateOne({ _id: member._id }, { $set: { ...changes, updatedAt: new Date() } });
    }
  }

  await mongoose.disconnect();
  console.log(confirm ? '\nDone.' : '\nDry run only. Re-run with --confirm to write.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
