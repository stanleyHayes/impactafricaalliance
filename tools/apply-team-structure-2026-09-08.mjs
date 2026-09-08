#!/usr/bin/env node
/**
 * Team structure supplied on 8 September 2026.
 *
 * Sets the leadership titles and the running order, replaces three supplied
 * biographies, corrects Adnan Mundi's name and role, and adds Aïché Goumané
 * to the country and regional group using the portrait already in the media
 * library.
 *
 * DRY-RUN by default. Pass --confirm to write.
 */
import process from 'node:process';

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';

const confirm = process.argv.includes('--confirm');
loadEnv({ path: 'apps/api/.env.production' });

/**
 * The sandbox resolver answers SRV but not TXT, so `mongodb+srv://` cannot be
 * used from here. Rebuild the equivalent standard connection string.
 */
const standardUri = (srv) => {
  const parsed = /^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/.exec(srv);
  if (!parsed) return srv;
  const [, creds, host, path = '/', query = ''] = parsed;
  const cluster = host.replace(/^[^.]+\./, '');
  const hosts = ['00', '01', '02'].map((n) => `ac-n7zzzzd-shard-00-${n}.${cluster}:27017`).join(',');
  const params = new URLSearchParams(query.replace(/^\?/, ''));
  params.set('tls', 'true');
  params.set('authSource', 'admin');
  return `mongodb://${creds}@${hosts}${path}?${params.toString()}`;
};

const paragraphs = (...parts) => parts.join('\n\n');

/** Ordered exactly as supplied: Emmanuel, Joshua, Jemimah, Rahmah, then the rest. */
const UPDATES = [
  { match: /^Emmanuel Mbansi/i, role: 'President / CEO', order: 1 },
  {
    match: /^Joshua Opoku/i,
    role: 'Vice President / COO',
    order: 2,
    bio: paragraphs(
      'Joshua Opoku Agyemang, widely known as The IoT Evangelist, is the Vice President of Impact Africa Alliance, a technology leader, ecosystem builder, and social innovator passionate about leveraging emerging technologies to transform Africa.',
      'As Co-founder and President of IoT Network Hub–Africa, he has built a community of 20,000+ technology enthusiasts across 20 African countries.',
      "At Impact Africa, Joshua champions innovation, technology, and digital skills while helping build the people and ecosystems shaping Africa's digital future.",
    ),
  },
  { match: /^Jemimah/i, order: 3 },
  {
    match: /^Rahmah/i,
    order: 4,
    bio: paragraphs(
      'Rahmah Mohammed is the Country Director, Nigeria of Impact Africa Alliance, an International Relations professional and emerging African leader passionate about youth empowerment, women’s leadership, inclusion, and sustainable development.',
      'With experience across gender equality, child health advocacy, protection, and youth development, she is committed to building platforms that equip young Africans to lead, contribute, and create meaningful impact across the continent.',
    ),
  },
  { match: /^Stanley Hayford/i, order: 5 },
  { match: /^Khadija/i, order: 6 },
  { match: /^Jef Harrys/i, order: 7 },
  {
    match: /^Testimony/i,
    order: 8,
    bio: paragraphs(
      'Testimony Tewogbola is the Graphic Designer at Impact Africa Alliance, a Registered Nurse, Brand Designer, and Creative Strategist known as “The Brand Nurse.”',
      'He combines healthcare, creativity, and digital communication to develop compelling visual identities and content.',
      'At Impact Africa, he uses his creative expertise to strengthen the organisation’s visual presence and communicate its mission, initiatives, and impact across Africa.',
    ),
  },
  // Williams Sarfo is inactive; moved clear of Jef so the executive tier has no tie.
  { match: /^Williams Sarfo/i, order: 9 },
  // 30+ keeps the country group clear of the board's own 21-23.
  { match: /^Kelvin Wright/i, order: 30 },
  { match: /^Aliyu Sadiq/i, order: 31 },
  { match: /^Adnan Mundi/i, name: 'Adnan Mundi Esq.', role: 'Head of Legal Affairs', order: 32 },
];

/** New record. The portrait is already in the media library from 7 September. */
const AICHE = {
  name: 'Aïché Goumané',
  role: 'Country Director, Mali',
  tier: 'non-executive',
  order: 33,
  isActive: true,
  // Placeholder copy pending her own words.
  bio: paragraphs(
    "Aïché Goumané is the Country Director, Mali of Impact Africa Alliance, leading the organisation's work with young people, partners and communities across the country.",
    'She oversees local programming and partnerships, connecting Malian youth to the leadership, enterprise and skills opportunities that Impact Africa Alliance runs across the continent.',
  ),
};

const run = async () => {
  await mongoose.connect(standardUri(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 30000 });
  const members = mongoose.connection.db.collection('teammembers');
  const media = mongoose.connection.db.collection('mediaitems');

  for (const { match, ...changes } of UPDATES) {
    const existing = await members.findOne({ name: match });
    if (!existing) {
      console.log(`SKIP  no member matching ${match}`);
      continue;
    }
    const diff = Object.entries(changes).filter(([key, value]) => existing[key] !== value);
    if (diff.length === 0) {
      console.log(`OK    ${existing.name} already correct`);
      continue;
    }
    for (const [key, value] of diff) {
      const before = key === 'bio' ? `${String(existing[key] ?? '').slice(0, 45)}…` : existing[key];
      const after = key === 'bio' ? `${String(value).slice(0, 45)}…` : value;
      console.log(`  ${existing.name}: ${key}  ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    }
    if (confirm) {
      await members.updateOne({ _id: existing._id }, { $set: { ...changes, updatedAt: new Date() } });
    }
  }

  const already = await members.findOne({ name: /Goumane|Goumané/i });
  if (already) {
    console.log(`OK    ${already.name} already present`);
  } else {
    const asset = await media.findOne({ publicId: 'iaa/team/aiche-goumane' });
    if (!asset) throw new Error('Aïché Goumané portrait not found in the media library');
    const now = new Date();
    const doc = {
      ...AICHE,
      photo: {
        url: asset.url,
        publicId: asset.publicId,
        width: asset.width,
        height: asset.height,
        alt: `${AICHE.name}, Impact Africa Alliance`,
      },
      createdAt: now,
      updatedAt: now,
    };
    console.log(`  CREATE ${doc.name} — ${doc.role} (${doc.tier}, order ${doc.order})`);
    if (confirm) await members.insertOne(doc);
  }

  console.log(`\n--- final order ---`);
  for (const m of await members.find({}).sort({ order: 1 }).toArray()) {
    console.log(`${m.tier.padEnd(14)} ${String(m.order).padEnd(3)} ${m.name.padEnd(24)} | ${m.role}`);
  }
  console.log(confirm ? '\nWritten.' : '\nDry run — pass --confirm to write.');
  await mongoose.disconnect();
};

await run();
