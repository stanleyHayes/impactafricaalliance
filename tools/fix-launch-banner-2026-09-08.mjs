#!/usr/bin/env node
/**
 * Correct the launch banner.
 *
 * It claimed the organisation had launched at the Google Community Centre.
 * That event has not happened — today is the website going public, and the
 * Accra launch is a separate date still to be confirmed.
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

const ANNOUNCEMENT = {
  enabled: true,
  message: 'Our new website is live — explore our programmes, our team, and what is coming up.',
  linkUrl: 'https://www.impactafricaalliance.org/events',
  linkLabel: 'See what is coming up',
};

const run = async () => {
  await mongoose.connect(standardUri(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 30000 });
  const settings = mongoose.connection.db.collection('sitesettings');
  const current = await settings.findOne({ key: 'site' });

  console.log('BEFORE:', current?.announcement?.message ?? '(none)');
  console.log('AFTER :', ANNOUNCEMENT.message);
  console.log(
    `\nThe popup is ${current?.popup?.enabled ? 'ENABLED' : 'disabled'} and still says: ${current?.popup?.title ?? '(none)'}`,
  );

  if (confirm) {
    await settings.updateOne(
      { key: 'site' },
      { $set: { announcement: ANNOUNCEMENT, updatedAt: new Date() } },
    );
    console.log('\nWritten.');
  } else {
    console.log('\nDry run — pass --confirm to write.');
  }
  await mongoose.disconnect();
};

await run();
