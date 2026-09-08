#!/usr/bin/env node
/**
 * Give each event the photograph of the person speaking at it.
 *
 * Events already name their host; the portrait usually already exists on that
 * person's team record. This matches the two by name and copies the portrait
 * onto the event, so the card and the event page show who is speaking rather
 * than the fallback artwork.
 *
 * Hosts with no matching team record are listed rather than guessed at.
 *
 * DRY-RUN by default. Pass --confirm to write.
 */
import process from 'node:process';

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';

const confirm = process.argv.includes('--confirm');
loadEnv({ path: 'apps/api/.env.production' });

/** Some networks answer SRV but time out on the TXT lookup mongodb+srv needs. */
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

/** "Aliyu Umar Sadiq" and "Aliyu Sadiq" are the same person; middle names are not. */
const nameTokens = (value) =>
  new Set(
    String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1),
  );

const isSamePerson = (host, member) => {
  const hostParts = nameTokens(host);
  const memberParts = nameTokens(member);
  if (hostParts.size === 0 || memberParts.size === 0) return false;
  const shared = [...memberParts].filter((token) => hostParts.has(token));
  // Both a given name and a family name have to line up, so "Aliyu Sadiq"
  // matches "Aliyu Umar Sadiq" but never "Aliyu Mohammed".
  return shared.length >= 2 && shared.length === Math.min(hostParts.size, memberParts.size);
};

const run = async () => {
  await mongoose.connect(standardUri(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 30000 });
  const events = mongoose.connection.db.collection('events');
  const team = mongoose.connection.db.collection('teammembers');

  const members = await team.find({}).toArray();
  const unmatched = [];

  for (const event of await events.find({}).sort({ startAt: 1 }).toArray()) {
    const title = String(event.title).slice(0, 46);
    if (!event.host) {
      console.log(`SKIP  ${title} — no host named`);
      continue;
    }
    const speaker = members.find((member) => isSamePerson(event.host, member.name));
    if (!speaker?.photo?.url) {
      unmatched.push(`${event.host}${speaker ? ' (team record has no portrait)' : ''}`);
      console.log(`MISS  ${title} — no portrait for ${event.host}`);
      continue;
    }
    if (event.image?.publicId === speaker.photo.publicId) {
      console.log(`OK    ${title} — already showing ${speaker.name}`);
      continue;
    }
    const image = {
      ...speaker.photo,
      alt: event.hostTitle ? `${speaker.name}, ${event.hostTitle}` : speaker.name,
    };
    console.log(`SET   ${title} -> ${speaker.name}`);
    if (confirm) {
      await events.updateOne({ _id: event._id }, { $set: { image, updatedAt: new Date() } });
    }
  }

  if (unmatched.length > 0) {
    console.log(`\nStill need a photograph for: ${unmatched.join(', ')}`);
  }
  console.log(confirm ? '\nWritten.' : '\nDry run — pass --confirm to write.');
  await mongoose.disconnect();
};

await run();
