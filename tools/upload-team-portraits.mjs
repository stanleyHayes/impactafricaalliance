#!/usr/bin/env node
/**
 * Publish team portraits into the CMS.
 *
 * Optimises each photograph to the 4:5 the team cards render, uploads it to
 * Cloudinary, records it in the media library so it can be reused, and points
 * the member's `photo` at the result.
 *
 * `zoom` and `focus` exist because framing varies wildly between
 * photographers. A subject shot from further back produces a head half the
 * size of everyone else's, and a row of cards then looks wrong even though
 * each picture is fine alone. Values are set by eye against an already-good
 * portrait; omit them to let sharp pick the salient region itself.
 *
 * A job with no `member` is uploaded to the library but attached to nobody —
 * for a photograph that has arrived before the person's role is known.
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

const WIDTH = 900;
const HEIGHT = 1125;
const ASPECT = WIDTH / HEIGHT;
const FOLDER = `${process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'iaa'}/team`;

const JOBS = [
  {
    file: 'jemimah.JPG',
    member: /^Jemimah/i,
    slug: 'jemimah-opata',
    alt: 'Jemimah Opata, Country Director, Ghana at Impact Africa Alliance.',
    // Shot seated and well back, so her head came out half the size of the
    // rest of the row.
    zoom: 1.5,
    focus: [0.537, 0.384],
  },
  {
    file: 'testimony.jpeg',
    member: /^Testimony/i,
    slug: 'testimony-tewogbola',
    alt: 'Testimony Tewogbola, Graphic Designer at Impact Africa Alliance.',
    zoom: 1.71,
    focus: [0.507, 0.474],
  },
  {
    file: 'Kelvin Wright.JPG',
    member: /^Kelvin Wright/i,
    slug: 'kelvin-wright',
    alt: 'Kelvin Wright, Country Director, Liberia at Impact Africa Alliance.',
    zoom: 1.6,
    focus: [0.471, 0.3],
  },
  {
    file: 'Adnan Mundi Esq.WEBP',
    member: /^Adnan Mundi/i,
    slug: 'adnan-mundi',
    alt: 'Adnan Mundi, member of the non-executive team at Impact Africa Alliance.',
  },
  {
    file: 'Aliyu Sadiq.PNG',
    member: /^Aliyu Sadiq/i,
    slug: 'aliyu-sadiq',
    alt: 'Aliyu Sadiq, Director of Diaspora Affairs (UK) at Impact Africa Alliance.',
  },
  {
    file: 'Aiche Goumane.WEBP',
    // No team record exists under this name, and inventing a role and tier for
    // a real person is not this tool's call. Filed in the library so it can be
    // attached from the dashboard once someone says where she belongs.
    member: null,
    slug: 'aiche-goumane',
    alt: 'Aiche Goumane.',
  },
];

const uri = process.env.MONGODB_URI_DIRECT ?? process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** The 4:5 box to take, clamped so it never runs off an edge. */
const cropBox = (srcWidth, srcHeight, zoom, [focusX, focusY]) => {
  let height = Math.round(srcHeight / zoom);
  let width = Math.round(height * ASPECT);
  if (width > srcWidth) {
    width = srcWidth;
    height = Math.round(width / ASPECT);
  }
  const clamp = (value, max) => Math.max(0, Math.min(Math.round(value), max));
  return {
    left: clamp(focusX * srcWidth - width / 2, srcWidth - width),
    top: clamp(focusY * srcHeight - height / 2, srcHeight - height),
    width,
    height,
  };
};

const optimise = async (file, job) => {
  const input = readFileSync(file);
  const meta = await sharp(input).rotate().metadata();
  let pipeline = sharp(input).rotate();
  if (job.zoom) {
    pipeline = pipeline
      .extract(cropBox(meta.width, meta.height, job.zoom, job.focus))
      .resize(WIDTH, HEIGHT, { fit: 'cover' });
  } else {
    pipeline = pipeline.resize(WIDTH, HEIGHT, {
      fit: 'cover',
      position: sharp.strategy.attention,
    });
  }
  const buffer = await pipeline.webp({ quality: 82 }).toBuffer();
  return { buffer, sourceSize: input.length, bytes: buffer.length };
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
  const team = db.collection('teammembers');
  const mediaItems = db.collection('mediaitems');

  console.log(confirm ? 'MODE: CONFIRM\n' : 'MODE: dry-run (pass --confirm)\n');

  for (const job of JOBS) {
    const source = path.resolve(job.file);
    const { buffer, sourceSize, bytes } = await optimise(source, job);

    let member = null;
    if (job.member) {
      const found = await team.find({ name: { $regex: job.member } }).toArray();
      if (found.length !== 1) {
        console.log(`SKIP ${job.file}: matched ${found.length} team records`);
        continue;
      }
      [member] = found;
    }

    const framing = job.zoom ? `zoom ${job.zoom}` : 'attention';
    const target = member ? member.name : 'LIBRARY ONLY (no team record)';
    console.log(
      `${job.file.padEnd(24)} ${(sourceSize / 1024).toFixed(0)}KB -> ${(bytes / 1024).toFixed(0)}KB  ${framing.padEnd(10)} -> ${target}`,
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

    await mediaItems.updateOne(
      { publicId: asset.publicId },
      {
        $set: {
          url: asset.url,
          filename: job.file,
          folder: 'team',
          altText: job.alt,
          tags: ['team', 'portrait'],
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

    if (member) {
      await team.updateOne({ _id: member._id }, { $set: { photo: asset, updatedAt: now } });
    }
    console.log(`  -> ${asset.url}`);
  }

  await mongoose.disconnect();
  console.log(confirm ? '\nDone.' : '\nDry run only. Re-run with --confirm to upload and write.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
