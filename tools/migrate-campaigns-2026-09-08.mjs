#!/usr/bin/env node
/**
 * Move the single banner and popup out of site settings into their own
 * collections, and queue the Accra launch behind its date.
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

const run = async () => {
  await mongoose.connect(standardUri(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  const settings = await db.collection('sitesettings').findOne({ key: 'site' });
  const now = new Date();

  const banners = [
    {
      name: 'Website live',
      message:
        settings?.announcement?.message ??
        'Our new website is live — explore our programmes, our team, and what is coming up.',
      linkUrl: settings?.announcement?.linkUrl,
      linkLabel: settings?.announcement?.linkLabel ?? 'See what is coming up',
      tone: 'announcement',
      isActive: settings?.announcement?.enabled ?? true,
      priority: 10,
    },
  ];

  // The old popup copy is kept as a draft rather than thrown away: the Accra
  // launch is still to be confirmed, so it is switched off and carries no
  // dates until somebody sets them.
  const popups = settings?.popup?.title
    ? [
        {
          name: 'Accra launch (date to confirm)',
          title: settings.popup.title,
          message: settings.popup.message ?? '',
          ctaLabel: settings.popup.ctaLabel,
          ctaUrl: settings.popup.ctaUrl,
          delaySeconds: settings.popup.delaySeconds ?? 3,
          isActive: false,
          priority: 0,
        },
      ]
    : [];

  for (const [collection, rows] of [
    ['announcements', banners],
    ['popups', popups],
  ]) {
    for (const row of rows) {
      const existing = await db.collection(collection).findOne({ name: row.name });
      if (existing) {
        console.log(`OK    ${collection}: "${row.name}" already there`);
        continue;
      }
      console.log(`CREATE ${collection}: "${row.name}" (active=${row.isActive})`);
      if (confirm) {
        await db
          .collection(collection)
          .insertOne({ ...row, createdAt: now, updatedAt: now });
      }
    }
  }

  console.log(confirm ? '\nWritten.' : '\nDry run — pass --confirm to write.');
  await mongoose.disconnect();
};

await run();
