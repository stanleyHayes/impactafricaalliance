#!/usr/bin/env node
/**
 * Publish supplied photography into the CMS.
 *
 * Does the whole journey for a picture that arrives as a file: optimise it,
 * upload it to Cloudinary, record it in the media library so it can be reused,
 * and point the slot that needs it at the result.
 *
 * Slots come in two kinds. `pillar:<key>` sets one of the four programme
 * photographs; `site:<key>` sets a banner or piece of artwork from
 * SITE_IMAGE_SLOTS. Both are upserts keyed on the slot, so re-running replaces
 * rather than accumulating.
 *
 * DRY-RUN by default. Pass --confirm to upload and write.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { v2 as cloudinary } from 'cloudinary';
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import sharp from 'sharp';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const envFlag = args.indexOf('--env');
loadEnv({ path: envFlag !== -1 ? args[envFlag + 1] : 'apps/api/.env.production' });

/** What to publish, and where it goes. Edit here rather than passing a dozen flags. */
const JOBS = [
  {
    file: process.env.HOME + '/Downloads/TOM-CHRIS - PEOPLE WHO INSPIRE.JPG',
    slot: 'team:Tom-Chris Emewulu',
    slug: 'tom-chris-emewulu',
    alt: 'Tom-Chris Emewulu, Impact Africa Alliance',
    tags: ['team', 'portrait', 'board'],
  },
  {
    file: process.env.HOME + '/Downloads/IMG_0203.JPG',
    slot: 'event:Scaling Your Business in West Africa',
    slug: 'jini-sebakunzi',
    // Framed like a team portrait: the event page shows its artwork at 4:5.
    portrait: true,
    alt: 'Jini Sebakunzi, Social Impact Leader',
    tags: ['speaker', 'portrait', 'event'],
  },
];

// Wide enough for a full-bleed banner on a large display, without shipping a
// 3.5 MB phone photograph to every visitor.
const MAX_WIDTH = 2000;
const FOLDER = `${process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'iaa'}/site`;

const configured = process.env.MONGODB_URI_DIRECT ?? process.env.MONGODB_URI;
if (!configured) {
  console.error('MONGODB_URI not found');
  process.exit(1);
}

/**
 * Some networks resolve SRV records but time out on the TXT lookup that
 * `mongodb+srv://` also needs, which fails before a single query is sent.
 * Rebuilding the equivalent standard URI skips that lookup.
 */
const standardUri = (srv) => {
  const parsed = /^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/.exec(srv);
  if (!parsed) return srv;
  const [, creds, host, dbPath = '/', query = ''] = parsed;
  const cluster = host.replace(/^[^.]+\./, '');
  const hosts = ['00', '01', '02'].map((n) => `ac-n7zzzzd-shard-00-${n}.${cluster}:27017`).join(',');
  const params = new URLSearchParams(query.replace(/^\?/, ''));
  params.set('tls', 'true');
  params.set('authSource', 'admin');
  return `mongodb://${creds}@${hosts}${dbPath}?${params.toString()}`;
};

const uri = standardUri(configured);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** The shape every team portrait is framed to, so the cards crop alike. */
const PORTRAIT = { width: 900, height: 1125 };

/**
 * Optimise in memory; nothing is written beside the original.
 *
 * A portrait is cropped to the house 4:5 rather than merely shrunk, using
 * sharp's attention strategy so the crop lands on the face instead of the
 * middle of the frame.
 */
const optimise = async (file, { portrait = false } = {}) => {
  const input = readFileSync(file);
  const resized = portrait
    ? sharp(input)
        .rotate()
        .resize({ ...PORTRAIT, fit: 'cover', position: sharp.strategy.attention })
    : sharp(input).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  const buffer = await resized.webp({ quality: 82 }).toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width, height: meta.height, bytes: buffer.length };
};

const uploadBuffer = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: FOLDER, public_id: publicId, overwrite: true, resource_type: 'image' },
        (error, result) => (error ? reject(error) : resolve(result)),
      )
      .end(buffer);
  });

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20_000 });
  const db = mongoose.connection.db;
  const pillarImages = db.collection('pillarimages');
  const teamMembers = db.collection('teammembers');
  const eventsCollection = db.collection('events');
  const siteImages = db.collection('siteimages');
  const mediaItems = db.collection('mediaitems');

  console.log(confirm ? 'MODE: CONFIRM\n' : 'MODE: dry-run (pass --confirm)\n');

  for (const job of JOBS) {
    const source = path.resolve(job.file);
    // Portraits are framed to the house 4:5; banners keep their own shape.
    const { buffer, width, height, bytes } = await optimise(source, {
      portrait: job.portrait ?? job.slot.startsWith('team:'),
    });
    const sizeIn = readFileSync(source).length;
    console.log(
      `${job.file}  ${(sizeIn / 1024 / 1024).toFixed(1)}MB -> ${(bytes / 1024).toFixed(0)}KB  ${width}x${height}  ->  ${job.slot}`,
    );
    if (!confirm) continue;

    const uploaded = await uploadBuffer(buffer, job.slug);
    const now = new Date();
    const asset = {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      alt: job.alt,
    };

    // Into the library first, so the picture is reusable even if the slot
    // write is changed later.
    await mediaItems.updateOne(
      { publicId: asset.publicId },
      {
        $set: {
          url: asset.url,
          filename: path.basename(job.file),
          folder: job.portrait ?? job.slot.startsWith('team:') ? 'team' : 'site',
          altText: job.alt,
          tags: job.tags,
          width: asset.width,
          height: asset.height,
          bytes: uploaded.bytes,
          format: uploaded.format,
          updatedAt: now,
        },
        $setOnInsert: { publicId: asset.publicId, createdAt: now },
      },
      { upsert: true },
    );

    const [kind, key] = job.slot.split(':');

    // `team:` and `event:` name an existing record by name or title rather
    // than a slot, so they update rather than upsert: creating a team member
    // or an event as a side effect of publishing a photograph would be a
    // surprise, and a typo would leave a stray record behind.
    if (kind === 'team' || kind === 'event') {
      const collection = kind === 'team' ? teamMembers : eventsCollection;
      const field = kind === 'team' ? 'name' : 'title';
      const imageField = kind === 'team' ? 'photo' : 'image';
      const match = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const existing = await collection.findOne({ [field]: match });
      if (!existing) {
        console.log(`  !! no ${kind} matching ${key} — nothing written`);
        continue;
      }
      await collection.updateOne(
        { _id: existing._id },
        { $set: { [imageField]: asset, updatedAt: now } },
      );
      console.log(`  -> ${existing[field]}: ${asset.url}`);
      continue;
    }

    const collection = kind === 'pillar' ? pillarImages : siteImages;
    const keyField = kind === 'pillar' ? 'pillarKey' : 'key';
    await collection.updateOne(
      { [keyField]: key },
      {
        $set: { image: asset, alt: job.alt, isActive: true, updatedAt: now },
        $setOnInsert: { [keyField]: key, createdAt: now },
      },
      { upsert: true },
    );
    console.log(`  -> ${asset.url}`);
  }

  await mongoose.disconnect();
  console.log(confirm ? '\nDone.' : '\nDry run only. Re-run with --confirm to upload and write.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
