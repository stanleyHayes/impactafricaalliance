import { ORG } from '../constants/content.js';
import type { Event } from '../schemas/event.js';

/** Events with no stated end run for an hour, which is the house default. */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

/** RFC 5545 escaping: backslash first, so later escapes are not re-escaped. */
const escapeText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** UTC basic format, e.g. 20260911T170000Z. */
const stamp = (date: Date): string => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** UTF-8 size of a single character. Counted by hand so this stays runtime-neutral. */
const characterBytes = (character: string): number => {
  const code = character.codePointAt(0) ?? 0;
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  if (code < 0x10000) return 3;
  return 4;
};

const byteLength = (value: string): number => {
  let total = 0;
  for (const character of value) {
    total += characterBytes(character);
  }
  return total;
};

/**
 * Fold to 75 octets per line, as required by RFC 5545. Long descriptions are
 * otherwise rejected or truncated by strict calendar clients. Continuation
 * lines start with a single space, which counts toward the limit.
 */
const fold = (line: string): string => {
  if (byteLength(line) <= 75) {
    return line;
  }
  const parts: string[] = [];
  let current = '';
  let width = 0;
  for (const character of line) {
    const size = characterBytes(character);
    // 74 leaves room for the leading space every continuation line carries.
    if (width + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      width = 0;
    }
    current += character;
    width += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
};

export interface EventIcsOptions {
  /** Absolute URL of the event's page on the public site. */
  url: string;
  /**
   * Joining link for an online session. Supplied only when building the copy
   * for someone who has registered — never for the public download.
   */
  meetingUrl?: string;
  /** Fixed "now", so the output is deterministic under test. */
  now?: Date;
}

/** The calendar body, in the order a reader would want it. */
const describe = (event: Event, options: EventIcsOptions): string => {
  const lines = [event.description.trim()];
  if (event.host) {
    lines.push(`Hosted by: ${event.hostTitle ? `${event.host} — ${event.hostTitle}` : event.host}`);
  }
  if (options.meetingUrl) {
    lines.push(`Join here: ${options.meetingUrl}`);
  }
  lines.push(`Event page: ${options.url}`);
  return lines.join('\n\n');
};

/**
 * A single-event iCalendar file.
 *
 * Written by hand rather than pulled from a library: the format is small, and
 * this keeps the same output available to the API (for email attachments) and
 * to anything else that needs it, with no dependency to keep in step.
 */
export const buildEventIcs = (event: Event, options: EventIcsOptions): string => {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  // A stable UID means re-importing updates the existing entry instead of
  // creating a duplicate in the attendee's calendar.
  const uid = `event-${event.id}@impactafricaalliance.org`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${ORG.name}//Events//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(options.now ?? new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(describe(event, options))}`,
    `LOCATION:${escapeText(options.meetingUrl ?? event.location)}`,
    `URL:${escapeText(options.url)}`,
    `ORGANIZER;CN=${escapeText(ORG.name)}:mailto:${ORG.email}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.map(fold).join('\r\n')}\r\n`;
};

/** A filename that stays readable once it lands in someone's downloads. */
export const eventIcsFilename = (event: Event): string => {
  const slug =
    event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'event';
  return `${slug}.ics`;
};
