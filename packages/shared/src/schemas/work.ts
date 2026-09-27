import { z } from 'zod';

import { type UserRole } from '../enums.js';

import { mediaAssetSchema, objectIdSchema, paginationQuerySchema } from './common.js';

/**
 * Building blocks shared by the work modules: projects, tasks, forms,
 * applications and impact stories.
 *
 * They live in one place so every module speaks the same language for
 * priorities, people, files, dates and the audit trail, instead of five
 * near-identical copies drifting apart.
 */

/** How pressing a piece of work is, from least to most. */
export const WORK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type WorkPriority = (typeof WORK_PRIORITIES)[number];

/**
 * Sort weight for each priority. Sorted as text the words come out as high,
 * low, medium, urgent, which tells a reader nothing.
 */
export const WORK_PRIORITY_RANK: Record<WorkPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

/** Direction of a sorted list. */
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * The id of something that lives inside a record rather than in its own
 * collection: a milestone, a checklist item, a form question, a story block.
 *
 * Form answers are stored against these ids, and the API's body sanitiser
 * drops any key that contains `.` or starts with `$`. Keeping to lowercase
 * letters, digits, `-` and `_` means an id is safe as a key, in a URL and in a
 * CSV header alike.
 */
export const STABLE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export const stableIdSchema = z
  .string()
  .regex(
    STABLE_ID_PATTERN,
    'Use up to 40 lowercase letters, numbers, hyphens or underscores, starting with a letter or number',
  );

// Twelve hex characters is 48 random bits: a clash inside one form or project
// is vanishingly unlikely, and the id stays short enough to read in an export.
const RANDOM_ID_LENGTH = 12;
// Leaves room for the hyphen and the random part inside the 40-character limit.
const MAX_ID_PREFIX_LENGTH = 40 - 1 - RANDOM_ID_LENGTH;

const randomHex = (length: number): string => {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID().replace(/-/g, '').slice(0, length);
  }
  // Browsers only offer randomUUID on secure pages, so a dashboard opened over
  // plain http on a local network lands here. These ids need to be unique
  // within one record, not unguessable, so Math.random is enough.
  let hex = '';
  while (hex.length < length) {
    hex += Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0');
  }
  return hex.slice(0, length);
};

/**
 * A fresh stable id, readable when given a prefix: `newStableId('step')`
 * returns something like `step-3f9a1c2b7d4e`.
 *
 * The prefix is cleaned to the allowed characters, so any label can be passed
 * without the result failing `stableIdSchema`.
 */
export const newStableId = (prefix?: string): string => {
  const random = randomHex(RANDOM_ID_LENGTH);
  // Cut long labels down first: the edge-trimming pattern below slows sharply
  // on a long run of hyphens, and only the first few characters survive anyway.
  const cleanPrefix = (prefix ?? '')
    .slice(0, MAX_ID_PREFIX_LENGTH * 2)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, MAX_ID_PREFIX_LENGTH);
  return cleanPrefix ? `${cleanPrefix}-${random}` : random;
};

/**
 * True when every item in a list carries its own id. Two milestones sharing an
 * id would make "mark this one done" change both.
 */
export const hasUniqueIds = (items: readonly { id: string }[]): boolean =>
  new Set(items.map((item) => item.id)).size === items.length;

/**
 * The few facts about a colleague that every work module shows: enough for a
 * chip with initials and an email link, and never their permissions or login
 * history. Built by the people directory (`GET /api/admin/people`), which is
 * why editors can see it when they cannot see the user list.
 */
export interface PersonSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/**
 * Optional free text. Trimmed and capped, and an emptied input ('') means
 * "nothing" rather than an empty string being stored.
 *
 * `.optional()` comes last so the inferred key is optional rather than
 * required-and-undefined.
 */
export const optionalTextField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? undefined : value))
    .optional();

/**
 * The PATCH counterpart of `optionalTextField`: absent leaves the stored value
 * alone, while null or an emptied input clears it.
 *
 * Without this an emptied input sends '', which becomes undefined, and a PATCH
 * treats undefined as "no change" — so the old text comes back after a save
 * that reported success.
 */
export const clearableTextField = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === '' ? null : value))
    .optional();

// The host part may not hold `@`, a backslash or whitespace; the rest may not
// hold a backslash or whitespace. Checked before the URL parser, which would
// otherwise quietly repair a backslash into a slash. Keeping `@` out of the
// host part is what keeps a user name out: it is the only way to write one.
const HTTPS_LINK_SHAPE = /^https:\/\/[^\s/?#\\@]+(?:[/?#][^\s\\]*)?$/i;

// Zod's URL check runs the platform's own URL parser, so a host it cannot
// read (`https://%%`) is refused as well.
const httpsUrlFormat = z.url({ protocol: /^https$/ });

/**
 * True for an https address that says plainly where it goes.
 *
 * Addresses with a user name or password are refused:
 * `https://impactafricaalliance.org@evil.example` reads as our site but opens
 * `evil.example`, which is the classic disguise for a phishing link.
 */
export const isHttpsLink = (value: string): boolean =>
  HTTPS_LINK_SHAPE.test(value) && httpsUrlFormat.safeParse(value).success;

/**
 * A link that must be https. Plain `.url()` accepts `javascript:` and
 * `mailto:` too, which is never what a link on a record should be; see
 * `isHttpsLink` for what else is refused.
 */
export const httpsUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine(isHttpsLink, 'Use a full link that starts with https://');

/**
 * A Cloudinary image as the work modules store it. The same as
 * `mediaAssetSchema`, except that the address must be https: these images end
 * up in `src` and `href` attributes on the public site and in the dashboard,
 * where a `javascript:` or `data:` address would be a way to run script. Every
 * upload is stored with Cloudinary's `secure_url`, so a real image always
 * passes.
 */
export const httpsMediaAssetSchema = mediaAssetSchema.extend({
  url: httpsUrlSchema,
});

/**
 * A true/false query parameter. Query strings carry text, and
 * `z.coerce.boolean()` would turn the text 'false' into true (any non-empty
 * string is truthy), so this accepts exactly 'true' or 'false'.
 */
export const booleanQueryParam = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

const splitCommaList = (value: unknown): unknown => {
  const parts: unknown[] = Array.isArray(value) ? value : [value];
  if (!parts.every((part) => typeof part === 'string')) {
    return value;
  }
  return (parts as string[])
    .flatMap((part) => part.split(','))
    .map((part) => part.trim())
    .filter((part) => part !== '');
};

/**
 * A list sent in a query string, as `a,b,c` or as repeated keys (which Express
 * turns into an array). Each entry is checked with `item`, and at most `max`
 * are accepted.
 *
 * An empty value parses to an empty list. What that means is the endpoint's
 * call; for a filter it normally means "no filter".
 */
export const commaList = <T extends z.ZodType>(item: T, max: number) =>
  z.preprocess(splitCommaList, z.array(item).max(max));

/** Most ids the people directory resolves in one request. */
export const PEOPLE_IDS_MAX = 50;

/**
 * `GET /api/admin/people`. `q` matches a name or email; `ids` looks up the
 * people already attached to a record so their chips can be drawn.
 */
export const peopleQuerySchema = paginationQuerySchema.extend({
  q: optionalTextField(80),
  ids: commaList(objectIdSchema, PEOPLE_IDS_MAX).optional(),
});
export type PeopleQuery = z.infer<typeof peopleQuerySchema>;

/** How Cloudinary stored an upload. Documents are `raw`; photos are `image`. */
export const FILE_RESOURCE_TYPES = ['image', 'raw', 'video'] as const;
export type FileResourceType = (typeof FILE_RESOURCE_TYPES)[number];

/**
 * A stored file: a Cloudinary snapshot like `httpsMediaAssetSchema`, plus what
 * a document list needs to show — its type, size and the name it was uploaded
 * under. Photos use the plain media asset; documents and attachments use this.
 * The address is https only because the dashboard renders it as a download
 * link.
 */
export const fileAssetSchema = httpsMediaAssetSchema.extend({
  format: z.string().trim().max(20).optional(),
  bytes: z.number().int().min(0).optional(),
  resourceType: z.enum(FILE_RESOURCE_TYPES).optional(),
  originalFilename: z.string().trim().max(200).optional(),
});
export type FileAsset = z.infer<typeof fileAssetSchema>;

/**
 * What a colleague sends to attach a document to a project or a task. The
 * name is what the list shows; the file's own name is often `scan0001.pdf`.
 */
export const fileAttachmentInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  file: fileAssetSchema,
});
export type FileAttachmentInput = z.infer<typeof fileAttachmentInputSchema>;

/** An attached document as the dashboard shows it, with who added it and when. */
export interface FileAttachment {
  id: string;
  name: string;
  file: FileAsset;
  /** Null when the colleague who added it has since been removed. */
  addedBy: PersonSummary | null;
  addedAt: string;
}

/** The modules that write to the audit trail. */
export const AUDIT_MODULES = [
  'projects',
  'tasks',
  'forms',
  'applications',
  'impact-stories',
] as const;
export type AuditModule = (typeof AUDIT_MODULES)[number];

/**
 * The words the audit trail records. `AuditEvent.action` is typed as a plain
 * string so an action added by a newer API still renders on an older
 * dashboard; this list is what a label map should cover.
 */
export const AUDIT_ACTIONS = [
  'created',
  'updated',
  'status-changed',
  'assigned',
  'unassigned',
  'archived',
  'restored',
  'deleted',
  'published',
  'unpublished',
  'commented',
  'reviewed',
  'submitted',
  // A project's evidence: photos and documents are added and removed one at
  // a time, apart from edits to the project itself.
  'media-added',
  'media-removed',
  'document-added',
  'document-removed',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** One changed field in an audit entry, as short display text. */
export interface AuditChange {
  field: string;
  from?: string | null;
  to?: string | null;
}

/**
 * One line of a record's activity log.
 *
 * `actor` is resolved when the log is read, so it follows a colleague's
 * current name; `actorEmail` is what was true at the time and survives the
 * account being deleted.
 */
export interface AuditEvent {
  id: string;
  module: AuditModule;
  entityType: string;
  entityId: string;
  action: string;
  actor: PersonSummary | null;
  actorEmail?: string;
  summary: string;
  changes?: AuditChange[];
  at: string;
}

/** Header that carries a preview token from the marketing site to the API. */
export const PREVIEW_TOKEN_HEADER = 'x-preview-token';

/**
 * A short-lived link to the real public page for something not yet public.
 * The token sits in the URL fragment, so it never reaches a server log or
 * analytics.
 */
export interface PreviewLink {
  url: string;
  expiresAt: string;
}

/** A calendar day, `YYYY-MM-DD`, with no time and no time zone. */
export const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real day: `2026-02-30` has the right shape but does not exist. */
export const isCalendarDateKey = (value: string): boolean => {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7)) - 1;
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day
  );
};

export const calendarDateSchema = z
  .string()
  .regex(CALENDAR_DATE_PATTERN, 'Use a date in the form YYYY-MM-DD')
  .refine(isCalendarDateKey, 'That date does not exist');

/**
 * Store a calendar day as noon UTC: `'2026-10-05'` becomes
 * `'2026-10-05T12:00:00.000Z'`.
 *
 * Midnight would slip to the previous day for anyone west of Greenwich. Noon
 * stays on the same day for every time zone from UTC−11 to UTC+11, so a due
 * date reads the same to the whole team. Throws on a day that does not exist,
 * because a silently shifted deadline is worse than a visible error.
 */
export const toCalendarDateIso = (key: string): string => {
  if (!isCalendarDateKey(key)) {
    throw new RangeError(`Not a calendar date: ${key}`);
  }
  return `${key}T12:00:00.000Z`;
};

/**
 * The calendar day a stored date belongs to, read in UTC. The inverse of
 * `toCalendarDateIso`, and also accepts a bare `YYYY-MM-DD`.
 *
 * Throws on a day that does not exist. JavaScript's own parser reads
 * `2026-02-30` as 2 March, which would move a deadline without anyone
 * noticing.
 */
export const calendarDateKey = (iso: string): string => {
  const time = Date.parse(iso);
  const day = iso.slice(0, 10);
  if (Number.isNaN(time) || (CALENDAR_DATE_PATTERN.test(day) && !isCalendarDateKey(day))) {
    throw new RangeError(`Not a date: ${iso}`);
  }
  return new Date(time).toISOString().slice(0, 10);
};

/**
 * Today's key in UTC. The server's fallback when a caller does not say what
 * day it is for them; browsers should send `localDateKey()` instead.
 */
export const todayKey = (date: Date = new Date()): string => date.toISOString().slice(0, 10);

/** Today's key in the device's own time zone, which is what "due today" means to a person. */
export const localDateKey = (date: Date = new Date()): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

/** Where a dated piece of work falls relative to today. */
export const DUE_BUCKETS = ['overdue', 'today', 'upcoming', 'none'] as const;
export type DueBucket = (typeof DUE_BUCKETS)[number];

/**
 * Which bucket a due date falls in, comparing calendar days rather than
 * instants so a task due today is not overdue at 12:01.
 *
 * `today` is the caller's own date key. Whether finished work belongs in a
 * bucket at all is the caller's decision; this only reads the date.
 *
 * Throws when `today` is not a real `YYYY-MM-DD` day. The comparison is on
 * text, so `2026-10-5` would sort after every October date and quietly file
 * the whole month as overdue.
 */
export const dueBucket = (dueIso: string | null | undefined, today: string): DueBucket => {
  if (!isCalendarDateKey(today)) {
    throw new RangeError(`Not a calendar date: ${today}`);
  }
  if (!dueIso || Number.isNaN(Date.parse(dueIso))) {
    return 'none';
  }
  const due = calendarDateKey(dueIso);
  if (due < today) {
    return 'overdue';
  }
  return due === today ? 'today' : 'upcoming';
};

/**
 * Space left between neighbouring cards on a board. Halving it on every drop
 * between the same two cards still leaves room for about fifty drops before
 * floating point runs out, far more than a real column sees.
 */
export const BOARD_ORDER_GAP = 1024;

/**
 * The position for a card dropped between `before` (the card above) and
 * `after` (the card below). Either may be missing at the ends of a column.
 *
 * Only the moved card changes, so a move is a single idempotent write that is
 * safe to retry. A neighbour whose position is not a finite number (NaN from
 * a bad read) is treated as missing, so one bad value is never copied onto
 * the card that moves.
 */
export const boardOrderBetween = (before?: number | null, after?: number | null): number => {
  const hasBefore = typeof before === 'number' && Number.isFinite(before);
  const hasAfter = typeof after === 'number' && Number.isFinite(after);
  if (hasBefore && hasAfter) {
    return (before + after) / 2;
  }
  if (hasBefore) {
    return before + BOARD_ORDER_GAP;
  }
  if (hasAfter) {
    return after - BOARD_ORDER_GAP;
  }
  return BOARD_ORDER_GAP;
};
