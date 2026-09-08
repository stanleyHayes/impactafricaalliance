#!/usr/bin/env node
/**
 * Launch-day content switch.
 *
 * Turns the countdown messaging into "we are live", and gives each office its
 * own phone number so the footer can show both rather than one shared line.
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

const ANNOUNCEMENT = {
  enabled: true,
  message:
    'IMPACT AFRICA ALLIANCE IS NOW LIVE — launched at the Google Community Centre, Accra, supported by Google Africa.',
  linkUrl: 'https://www.impactafricaalliance.org/events',
  linkLabel: 'See what is coming up',
};

/** Each office answers its own phone; a caller in Abuja should not ring Accra. */
const OFFICE_PHONES = [
  { match: /ghana|accra|head/i, phone: '+233 50 661 9598' },
  { match: /nigeria|abuja/i, phone: '+234 803 412 0307' },
];

const run = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20_000 });
  const db = mongoose.connection.db;
  console.log(confirm ? 'MODE: CONFIRM\n' : 'MODE: dry-run (pass --confirm)\n');

  const settings = db.collection('sitesettings');
  const site = await settings.findOne({ key: 'site' });
  console.log('announcement');
  console.log('  from:', site?.announcement?.message ?? '(none)');
  console.log('  to:  ', ANNOUNCEMENT.message);
  console.log('popup');
  console.log('  from:', site?.popup?.enabled ? `enabled — "${site.popup.title}"` : 'disabled');
  // The popup existed to count down to a date that has arrived. Switching it
  // off is the honest end of that, rather than leaving a countdown running.
  console.log('  to:   disabled');
  console.log();

  const offices = db.collection('offices');
  const rows = await offices.find({}).toArray();
  for (const office of rows) {
    const target = OFFICE_PHONES.find(
      (entry) => entry.match.test(office.label ?? '') || entry.match.test(office.country ?? ''),
    );
    if (!target) {
      console.log(`office ${office.label}: no phone mapped, left alone`);
      continue;
    }
    if (office.phone === target.phone) {
      console.log(`office ${office.label}: already ${target.phone}`);
      continue;
    }
    console.log(`office ${office.label}: ${office.phone ?? '(none)'} -> ${target.phone}`);
    if (confirm) {
      await offices.updateOne(
        { _id: office._id },
        { $set: { phone: target.phone, updatedAt: new Date() } },
      );
    }
  }

  if (confirm) {
    await settings.updateOne(
      { key: 'site' },
      {
        $set: {
          announcement: ANNOUNCEMENT,
          'popup.enabled': false,
          updatedAt: new Date(),
        },
      },
    );
  }

  await mongoose.disconnect();
  console.log(confirm ? '\nDone.' : '\nDry run only. Re-run with --confirm to write.');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
