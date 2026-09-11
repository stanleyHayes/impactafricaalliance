#!/usr/bin/env node
/**
 * Sends one reminder to everyone registered for an event, and records it in
 * the same log the dashboard writes to.
 *
 * The dashboard composer does this too; this exists for a send that has to go
 * out from here. It mirrors the service's template exactly so the two produce
 * the same email and the same log entry.
 *
 * DRY-RUN by default: prints the recipient count and the rendered email.
 * Pass --confirm to send.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import { Resend } from 'resend';

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

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

const bodyToHtml = (body) =>
  body
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('');

const whenFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC',
});
/** en-GB writes "pm"; the emails write "PM". */
const when = (date) =>
  whenFormatter.format(date).replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());

const SUBJECT = readFileSync('.reminder-subject.txt', 'utf8').trim();
const BODY = readFileSync('.reminder-body.txt', 'utf8').trimEnd();
const EVENT_MATCH = /Leveraging AI/i;
/** Resend allows a couple of sends a second; this stays comfortably under. */
const GAP_MS = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  await mongoose.connect(standardUri(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  const event = await db.collection('events').findOne({ title: EVENT_MATCH });
  if (!event) throw new Error('event not found');

  const registrations = await db
    .collection('eventregistrations')
    .find({ eventId: event._id })
    .project({ email: 1, fullName: 1 })
    .toArray();

  const siteUrl = (process.env.PUBLIC_SITE_URL ?? 'https://www.impactafricaalliance.org').replace(/\/$/, '');
  const html = (firstName) =>
    [
      `<p>Hi ${escapeHtml(firstName)},</p>`,
      bodyToHtml(BODY),
      `<hr style="border:0;border-top:1px solid #E4E0D6;margin:24px 0 18px" />`,
      `<p style="margin:0 0 6px"><strong>${escapeHtml(event.title)}</strong></p>`,
      `<p style="margin:0 0 6px">${escapeHtml(when(event.startAt))} GMT</p>`,
      `<p style="margin:0 0 6px">${escapeHtml(event.location)}</p>`,
      event.meetingUrl
        ? `<p style="margin:18px 0"><a href="${escapeHtml(event.meetingUrl)}" style="background:#183E33;color:#F4EDDC;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block">Join the session</a></p>`
        : '',
      `<p style="margin:14px 0 0"><a href="${escapeHtml(`${siteUrl}/events/${event._id}`)}">View the event page</a></p>`,
      `<p style="color:#666;font-size:13px">Impact Africa Alliance — Empowering Africa. One Community at a Time.</p>`,
    ].join('');

  console.log(`event      : ${event.title}`);
  console.log(`starts     : ${when(event.startAt)} GMT`);
  console.log(`joining    : ${event.meetingUrl ?? '(none)'}`);
  console.log(`recipients : ${registrations.length}`);
  console.log(`subject    : ${SUBJECT}`);
  console.log(`\n--- rendered for the first recipient ---\n${html('Ama')}\n`);

  if (!confirm) {
    console.log('Dry run — pass --confirm to send.');
    await mongoose.disconnect();
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let failed = 0;
  for (const [index, r] of registrations.entries()) {
    const firstName = String(r.fullName ?? '').trim().split(/\s+/)[0] || 'there';
    try {
      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: r.email,
        subject: SUBJECT,
        html: html(firstName),
      });
      if (error) throw new Error(error.message ?? 'send rejected');
    } catch (err) {
      failed += 1;
      console.log(`  !! ${r.email}: ${err.message}`);
    }
    if ((index + 1) % 20 === 0) console.log(`  ...${index + 1}/${registrations.length}`);
    await sleep(GAP_MS);
  }

  const now = new Date();
  await db.collection('eventmessages').insertOne({
    eventId: event._id,
    kind: 'reminder',
    subject: SUBJECT,
    body: BODY,
    includeMeetingLink: Boolean(event.meetingUrl),
    status: failed === registrations.length ? 'failed' : 'sent',
    recipientCount: registrations.length - failed,
    failedCount: failed,
    sentBy: 'sent on request',
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`\nSent to ${registrations.length - failed}. Failed: ${failed}. Recorded in the event's message log.`);
  await mongoose.disconnect();
};

await run();
