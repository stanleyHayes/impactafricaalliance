#!/usr/bin/env node
/**
 * Apply the team details supplied in the website-review document.
 *
 * Only fills gaps the document actually covers: a biography that is still
 * empty, and profile links the document supplies for someone who has none.
 * Existing copy is left alone, so re-running after an editor has revised a
 * bio in the dashboard will not overwrite their work.
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

const TESTIMONY_BIO = [
  'Testimony Tewogbola is a Registered Nurse, Brand Designer, Creative Strategist, and community builder passionate about using creativity, communication, and digital skills to create meaningful impact. He is popularly known as “The Brand Nurse”, an identity that reflects the intersection of his healthcare background and his work in branding and visual communication.',
  'He holds a Bachelor of Nursing Science (BNSc.) and is a registered nurse with a strong interest in healthcare, leadership, innovation, creativity, and human development. While nursing introduced him to the importance of service, empathy, and people-centred impact, his creative journey has let him explore another dimension of service: helping individuals, businesses, organisations, and communities communicate their value effectively.',
  'As a Brand Designer and Creative Strategist, Testimony works with entrepreneurs, CEOs, organisations, and growing brands to build stronger visual identities and tell their stories with clarity. His work spans brand identity design, social media design, visual communication, content strategy, and creative direction. Over the years he has worked across different sectors, building a growing portfolio for both Nigerian and international clients.',
  'Beyond client work, he is passionate about helping professionals discover digital skills beyond their traditional career paths. He is the Director of Creative Nurses Community (CNC), created to equip nurses and other healthcare professionals with creative and digital skills that expand their influence and open opportunities outside the conventional boundaries of clinical practice. He has also served in creative and leadership roles within professional and youth-focused initiatives.',
  'At Impact Africa Alliance, Testimony brings together branding, visual communication, content, and digital creativity in support of the organisation’s mission. He believes Africa’s transformation will require not only ideas and resources, but people willing to use their skills intentionally — to solve problems, tell better stories, build stronger institutions, and create opportunities for others.',
  'His professional journey is driven by a simple belief: the right skills, intentionally applied, become powerful tools for impact. Through nursing, design, leadership, and community development, Testimony continues to explore how creativity and purpose work together to build brands, empower people, and contribute to a better Africa.',
].join('\n\n');

/** Each entry names the person, then only the fields the document supplies. */
const UPDATES = [
  { match: /^Testimony/i, label: 'Testimony Tewogbola', fields: { bio: TESTIMONY_BIO } },
  {
    match: /khadija/i,
    label: 'Khadija Ibrahim',
    fields: {
      instagramUrl: 'https://www.instagram.com/herfuture_hf',
      linkedInUrl: 'https://www.linkedin.com/in/nana-khadija-ibrahim-92b24a1b8',
    },
  },
];

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  const team = mongoose.connection.db.collection('teammembers');
  console.log(confirm ? 'MODE: CONFIRM\n' : 'MODE: dry-run (pass --confirm)\n');

  for (const { match, label, fields } of UPDATES) {
    const members = await team.find({ name: { $regex: match } }).toArray();
    if (members.length !== 1) {
      console.log(`SKIP ${label}: matched ${members.length} records`);
      continue;
    }
    const [member] = members;
    // Only write what is genuinely missing, so an editor's later change stands.
    const changes = Object.fromEntries(
      Object.entries(fields).filter(([key]) => !String(member[key] ?? '').trim()),
    );
    if (Object.keys(changes).length === 0) {
      console.log(`${member.name}: already complete`);
      continue;
    }
    for (const [key, value] of Object.entries(changes)) {
      console.log(`${member.name}: set ${key} (${String(value).length} chars)`);
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
