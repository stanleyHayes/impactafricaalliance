#!/usr/bin/env node
/**
 * Retire the "Ready for Work" name from live content.
 *
 * The service mark was not granted, so the phrase has to come off anything
 * public. The code side is a separate commit; this is the database.
 *
 * DRY-RUN by default. Pass --confirm to write.
 */
import process from 'node:process';

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';

const confirm = process.argv.includes('--confirm');
loadEnv({ path: 'apps/api/.env.production' });

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

const NEW_TITLE = 'Career Launchpad: How to Land Your Dream Job in 60 Days';
const NEW_QUESTION = 'What would make you feel ready for your first role?';

const run = async () => {
  await mongoose.connect(standardUri(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 30000 });
  const events = mongoose.connection.db.collection('events');
  const event = await events.findOne({ title: /ready[\s-]*for[\s-]*work/i });
  if (!event) {
    console.log('Nothing left to rename.');
    await mongoose.disconnect();
    return;
  }

  console.log(`title    "${event.title}"\n      -> "${NEW_TITLE}"`);

  // Answers already given keep the wording they were asked under; only the
  // question put to future registrants changes.
  const questions = (event.questions ?? []).map((q) =>
    /ready[\s-]*for[\s-]*work/i.test(q.label ?? '') ? { ...q, label: NEW_QUESTION } : q,
  );
  const changed = questions.filter((q, i) => q.label !== event.questions?.[i]?.label);
  for (const q of changed) console.log(`question -> "${q.label}"`);

  if (confirm) {
    await events.updateOne(
      { _id: event._id },
      { $set: { title: NEW_TITLE, questions, updatedAt: new Date() } },
    );
    console.log('\nWritten.');
  } else {
    console.log('\nDry run — pass --confirm to write.');
  }
  await mongoose.disconnect();
};

await run();
