import { z } from 'zod';

import { PILLARS } from '../constants/content.js';
import { truncate } from '../utils/social-content.js';

import {
  objectIdSchema,
  paginationQuerySchema,
  slugSchema,
  type MediaAsset,
  type Timestamped,
} from './common.js';
import {
  programmeKeySchema,
  type ProgrammeKey,
  type ProjectMediaItem,
  type ProjectMetric,
  type ProjectPartner,
  type ProjectRef,
} from './project.js';
import { partialForUpdate } from './update.js';
import {
  clearableTextField,
  hasUniqueIds,
  httpsMediaAssetSchema,
  isHttpsLink,
  newStableId,
  optionalTextField,
  stableIdSchema,
  type PersonSummary,
} from './work.js';

/**
 * An impact story is a public, edited account of what a project achieved,
 * built from blocks rather than one long body so a story can mix narrative,
 * photos, numbers and quotes without anyone writing HTML.
 *
 * A story may start from a project, but it is always a copy: editing the
 * project later never changes a published story, and nothing public is ever
 * rendered from a project's working record.
 */

export const IMPACT_STORY_STATUSES = ['draft', 'in-review', 'published', 'archived'] as const;
export type ImpactStoryStatus = (typeof IMPACT_STORY_STATUSES)[number];

/**
 * The moves allowed from each status. A published story is taken down to a
 * draft, not back to review, so it is clear it is no longer public. An
 * archived story comes back as a draft and is checked again before it can be
 * republished.
 */
export const IMPACT_STORY_TRANSITIONS: Record<ImpactStoryStatus, readonly ImpactStoryStatus[]> = {
  draft: ['in-review', 'published', 'archived'],
  'in-review': ['draft', 'published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft'],
};

/**
 * Statuses only an administrator may move a story into. Taking a story off the
 * site (any move out of `published`) needs an administrator as well; see
 * `isAdminStoryMove`. Publishing puts words on the public site in the
 * organisation's name, so it stays with the people accountable for them.
 */
export const IMPACT_STORY_ADMIN_TARGETS = [
  'published',
  'archived',
] as const satisfies readonly ImpactStoryStatus[];

/** True when a status move needs the Admin role: publishing, unpublishing or archiving. */
export const isAdminStoryMove = (from: ImpactStoryStatus, to: ImpactStoryStatus): boolean =>
  from === 'published' || (IMPACT_STORY_ADMIN_TARGETS as readonly ImpactStoryStatus[]).includes(to);

/** Whether this person may move a story from one status to another. */
export const canTransitionImpactStory = (
  from: ImpactStoryStatus,
  to: ImpactStoryStatus,
  { isAdmin }: { isAdmin: boolean },
): boolean =>
  from !== to &&
  IMPACT_STORY_TRANSITIONS[from].includes(to) &&
  (isAdmin || !isAdminStoryMove(from, to));

/** Version of the block format. Raised if a block's data ever changes shape. */
export const IMPACT_STORY_SCHEMA_VERSION = 1;

export const STORY_BLOCK_TYPES = [
  'hero',
  'rich-text',
  'image',
  'gallery',
  'video',
  'quote',
  'metrics',
  'timeline',
  'partners',
  'cta',
] as const;
export type StoryBlockType = (typeof STORY_BLOCK_TYPES)[number];

/** Names for each block type in messages, such as "Block 3 (Quote)". */
export const STORY_BLOCK_LABELS: Record<StoryBlockType, string> = {
  hero: 'Hero',
  'rich-text': 'Text',
  image: 'Image',
  gallery: 'Gallery',
  video: 'Video',
  quote: 'Quote',
  metrics: 'Numbers',
  timeline: 'Timeline',
  partners: 'Partners',
  cta: 'Call to action',
};

const SAFE_SITE_PATH = /^\/(?![/\\])[^\s\\]*$/;

/**
 * True for a link a public page may carry: an https address, or a path on this
 * site such as `/get-involved`. `javascript:` and every other scheme are
 * refused, and so are `//` and `/\`, which browsers read as a link to another
 * site, and addresses carrying a user name (see `isHttpsLink`).
 */
export const isSafeLink = (value: string): boolean =>
  isHttpsLink(value) || SAFE_SITE_PATH.test(value);

export const safeLinkSchema = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine(
    isSafeLink,
    'Use a link starting with https://, or a page on this site such as /get-involved',
  );

const optionalSafeLink = z
  .union([z.literal(''), safeLinkSchema])
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const YOUTUBE_ID = '([A-Za-z0-9_-]{11})(?:[?&#/]|$)';
const YOUTUBE_PATTERNS = [
  new RegExp(`^https?://(?:www\\.|m\\.)?youtube\\.com/watch\\?(?:[^#]*&)?v=${YOUTUBE_ID}`, 'i'),
  new RegExp(`^https?://youtu\\.be/${YOUTUBE_ID}`, 'i'),
  new RegExp(`^https?://(?:www\\.|m\\.)?youtube\\.com/(?:shorts|embed|live)/${YOUTUBE_ID}`, 'i'),
  new RegExp(`^https?://(?:www\\.)?youtube-nocookie\\.com/embed/${YOUTUBE_ID}`, 'i'),
];
// An unlisted Vimeo video carries a privacy hash, as a second path segment on
// the page link or as `h=` on the player link. The player refuses the video
// without it, so it is kept; it is plain hex, so it is safe to copy across.
const VIMEO_HASH = '([0-9a-f]{6,20})';
const VIMEO_PAGE = new RegExp(
  `^https?://(?:www\\.)?vimeo\\.com/(\\d+)(?:/${VIMEO_HASH})?(?:[?#/]|$)`,
  'i',
);
const VIMEO_PLAYER = /^https?:\/\/player\.vimeo\.com\/video\/(\d+)(?:[?#/]|$)/i;
const VIMEO_HASH_PARAM = new RegExp(`[?&]h=${VIMEO_HASH}(?:[&#]|$)`, 'i');

const firstMatch = (patterns: readonly RegExp[], url: string): string | undefined =>
  patterns.map((pattern) => pattern.exec(url)?.[1]).find((id) => id !== undefined);

const vimeoEmbedUrl = (url: string): string | null => {
  const page = VIMEO_PAGE.exec(url);
  const player = page ? null : VIMEO_PLAYER.exec(url);
  const id = page?.[1] ?? player?.[1];
  if (!id) {
    return null;
  }
  const hash = page ? page[2] : VIMEO_HASH_PARAM.exec(url)?.[1];
  return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash.toLowerCase()}` : ''}`;
};

/**
 * The embed address for a YouTube or Vimeo link, or null for anything else.
 *
 * Only these two hosts are embedded, so a story can never frame an arbitrary
 * page, and the address is rebuilt from the video's id rather than copied, so
 * nothing else in the link reaches the page. YouTube goes through its
 * no-cookie domain, which does not set tracking cookies until the visitor
 * presses play.
 */
export const videoEmbedUrl = (url: string): string | null => {
  const clean = url.trim();
  const youtube = firstMatch(YOUTUBE_PATTERNS, clean);
  if (youtube) {
    return `https://www.youtube-nocookie.com/embed/${youtube}`;
  }
  return vimeoEmbedUrl(clean);
};

const blockHeading = optionalTextField(120);

/** The opening of a story: a large heading over an image. */
export const heroBlockDataSchema = z.object({
  /** A small line above the heading, such as the programme name. */
  eyebrow: optionalTextField(60),
  heading: z.string().trim().min(2).max(160),
  subheading: optionalTextField(300),
  image: httpsMediaAssetSchema.nullable().optional(),
});

/** Narrative in Markdown. Rendered without raw HTML, so nothing in it can run. */
export const richTextBlockDataSchema = z.object({
  markdown: z.string().trim().min(1).max(20000),
});

export const imageBlockDataSchema = z.object({
  image: httpsMediaAssetSchema,
  caption: optionalTextField(300),
});

export const galleryBlockDataSchema = z.object({
  heading: blockHeading,
  images: z
    .array(z.object({ image: httpsMediaAssetSchema, caption: optionalTextField(300) }))
    .min(1)
    .max(24),
});

/** A YouTube or Vimeo video; see `videoEmbedUrl`. */
export const videoBlockDataSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine((value) => videoEmbedUrl(value) !== null, 'Use a YouTube or Vimeo link'),
  caption: optionalTextField(300),
});

export const quoteBlockDataSchema = z.object({
  text: z.string().trim().min(3).max(600),
  attribution: optionalTextField(120),
  role: optionalTextField(120),
  photo: httpsMediaAssetSchema.nullable().optional(),
});

export const metricsBlockDataSchema = z.object({
  heading: blockHeading,
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.number(),
        suffix: optionalTextField(12),
      }),
    )
    .min(1)
    .max(8),
});

export const timelineBlockDataSchema = z.object({
  heading: blockHeading,
  items: z
    .array(
      z.object({
        /** When: "March 2026", "Week 1". */
        label: z.string().trim().min(1).max(60),
        title: z.string().trim().min(1).max(160),
        description: optionalTextField(500),
      }),
    )
    .min(1)
    .max(20),
});

export const partnersBlockDataSchema = z.object({
  heading: blockHeading,
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        logo: httpsMediaAssetSchema.nullable().optional(),
        url: optionalSafeLink,
      }),
    )
    .min(1)
    .max(24),
});

/** A closing prompt: donate, volunteer, read more. */
export const ctaBlockDataSchema = z.object({
  heading: z.string().trim().min(2).max(160),
  body: optionalTextField(400),
  label: z.string().trim().min(2).max(40),
  url: safeLinkSchema,
});

/** The data schema for each block type, for checking one block on its own. */
export const STORY_BLOCK_DATA_SCHEMAS = {
  hero: heroBlockDataSchema,
  'rich-text': richTextBlockDataSchema,
  image: imageBlockDataSchema,
  gallery: galleryBlockDataSchema,
  video: videoBlockDataSchema,
  quote: quoteBlockDataSchema,
  metrics: metricsBlockDataSchema,
  timeline: timelineBlockDataSchema,
  partners: partnersBlockDataSchema,
  cta: ctaBlockDataSchema,
} as const satisfies Record<StoryBlockType, z.ZodType>;

/**
 * One block. The type decides the shape of `data`, and an unknown type is
 * refused outright rather than stored for a renderer that cannot draw it.
 */
export const storyBlockSchema = z.discriminatedUnion('type', [
  z.object({ id: stableIdSchema, type: z.literal('hero'), data: heroBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('rich-text'), data: richTextBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('image'), data: imageBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('gallery'), data: galleryBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('video'), data: videoBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('quote'), data: quoteBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('metrics'), data: metricsBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('timeline'), data: timelineBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('partners'), data: partnersBlockDataSchema }),
  z.object({ id: stableIdSchema, type: z.literal('cta'), data: ctaBlockDataSchema }),
]);
export type StoryBlock = z.infer<typeof storyBlockSchema>;
export type StoryBlockInput = z.input<typeof storyBlockSchema>;
/** The data of one block type: `StoryBlockData<'quote'>` is a quote's fields. */
export type StoryBlockData<T extends StoryBlockType> = Extract<StoryBlock, { type: T }>['data'];

// Functions, so every new block gets its own objects rather than sharing one.
const EMPTY_BLOCK_DATA: { [T in StoryBlockType]: () => Partial<StoryBlockData<T>> } = {
  hero: () => ({ heading: '' }),
  'rich-text': () => ({ markdown: '' }),
  image: () => ({}),
  gallery: () => ({ images: [] }),
  video: () => ({ url: '' }),
  quote: () => ({ text: '' }),
  metrics: () => ({ items: [{ label: '', value: 0 }] }),
  timeline: () => ({ items: [{ label: '', title: '' }] }),
  partners: () => ({ items: [{ name: '' }] }),
  cta: () => ({ heading: '', label: '', url: '' }),
};

/**
 * Starting data for a block added from the "Add block" menu: the fields the
 * editor will fill in, empty. It does not pass `storyBlockSchema` until they
 * are filled — an image block has no image yet — so the editor validates a
 * block before saving it.
 */
export const emptyBlockData = <T extends StoryBlockType>(type: T): Partial<StoryBlockData<T>> =>
  EMPTY_BLOCK_DATA[type]();

const storySeoSchema = z.object({
  title: optionalTextField(70),
  description: optionalTextField(160),
  image: httpsMediaAssetSchema.nullable().optional(),
});

/**
 * Creating or replacing a story. Every block is checked in full on save, so a
 * stored story can always be drawn. What else it needs before going public is
 * in `storyPublishProblems`. Status has its own endpoint.
 */
export const impactStoryInputSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: slugSchema,
  excerpt: z.string().trim().min(10).max(400),
  cover: httpsMediaAssetSchema.nullable().optional(),
  /** The project it tells the story of. Internal: never sent to the public site. */
  projectId: objectIdSchema.nullable().optional(),
  blocks: z
    .array(storyBlockSchema)
    .max(60)
    .refine(hasUniqueIds, 'Each block needs its own id')
    .default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  country: optionalTextField(80),
  programme: programmeKeySchema.nullable().optional(),
  /** What search engines and link previews show, when it should differ from the story. */
  seo: storySeoSchema.optional(),
});
export type ImpactStoryInput = z.infer<typeof impactStoryInputSchema>;

/** Editing a story. Null clears the country or the search settings; blocks are replaced whole. */
export const impactStoryUpdateSchema = partialForUpdate(impactStoryInputSchema).extend({
  country: clearableTextField(80),
  seo: storySeoSchema.nullable().optional(),
});
export type ImpactStoryUpdate = z.infer<typeof impactStoryUpdateSchema>;

/** Moving a story through review and onto the site. */
export const impactStoryStatusChangeSchema = z.object({
  status: z.enum(IMPACT_STORY_STATUSES),
});
export type ImpactStoryStatusChange = z.infer<typeof impactStoryStatusChangeSchema>;

/** The dashboard's tabs over stories. Drafts include those in review. */
export const IMPACT_STORY_VIEWS = ['drafts', 'published', 'archived', 'all'] as const;
export type ImpactStoryView = (typeof IMPACT_STORY_VIEWS)[number];

/** The statuses each view shows. */
export const IMPACT_STORY_VIEW_STATUSES: Record<ImpactStoryView, readonly ImpactStoryStatus[]> = {
  drafts: ['draft', 'in-review'],
  published: ['published'],
  archived: ['archived'],
  all: IMPACT_STORY_STATUSES,
};

/** `GET /api/admin/impact-stories`. A `status` narrows the view further. */
export const impactStoryListQuerySchema = paginationQuerySchema.extend({
  q: optionalTextField(80),
  view: z.enum(IMPACT_STORY_VIEWS).default('drafts'),
  status: z.enum(IMPACT_STORY_STATUSES).optional(),
  projectId: objectIdSchema.optional(),
  programme: programmeKeySchema.optional(),
});
export type ImpactStoryListQuery = z.infer<typeof impactStoryListQuerySchema>;

/** `GET /api/impact-stories`: published stories only. */
export const publicImpactStoryQuerySchema = paginationQuerySchema.extend({
  programme: programmeKeySchema.optional(),
  country: optionalTextField(80),
  tag: optionalTextField(40),
});
export type PublicImpactStoryQuery = z.infer<typeof publicImpactStoryQuerySchema>;

export interface ImpactStorySeo {
  title?: string;
  description?: string;
  image?: MediaAsset | null;
}

/** A story as the dashboard sees it. */
export interface ImpactStory extends Timestamped {
  title: string;
  slug: string;
  excerpt: string;
  cover?: MediaAsset | null;
  projectId?: string | null;
  project?: ProjectRef | null;
  status: ImpactStoryStatus;
  blocks: StoryBlock[];
  tags: string[];
  country?: string;
  programme?: ProgrammeKey | null;
  seo?: ImpactStorySeo | null;
  /** First publication. Kept when a story is unpublished and published again. */
  publishedAt?: string | null;
  schemaVersion: number;
  createdBy?: PersonSummary | null;
  updatedBy?: PersonSummary | null;
}

/** A story as a dashboard list row. */
export interface ImpactStoryListItem extends Timestamped {
  title: string;
  slug: string;
  excerpt: string;
  cover?: MediaAsset | null;
  status: ImpactStoryStatus;
  projectId?: string | null;
  project?: ProjectRef | null;
  tags: string[];
  country?: string;
  programme?: ProgrammeKey | null;
  publishedAt?: string | null;
  blockCount: number;
  updatedBy?: PersonSummary | null;
}

/**
 * A story as the public site sees it. No project link and no names of the
 * staff who wrote it: the story stands on its own.
 */
export interface PublicImpactStory {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover?: MediaAsset;
  blocks: StoryBlock[];
  tags: string[];
  country?: string;
  programme?: ProgrammeKey;
  seo?: ImpactStorySeo;
  publishedAt: string;
  updatedAt: string;
}

/** A published story as a card on the stories page. */
export interface PublicImpactStoryListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover?: MediaAsset;
  tags: string[];
  country?: string;
  programme?: ProgrammeKey;
  publishedAt: string;
}

/** What `storyPublishProblems` reads. Blocks may come straight from storage, so they are checked in full. */
export interface StoryPublishCandidate {
  excerpt?: string | null;
  cover?: MediaAsset | null;
  blocks?: readonly unknown[] | null;
}

// Three characters rules out placeholders like "x" or "." without asking for an essay.
const MIN_ALT_TEXT = 3;

const hasAltText = (asset: MediaAsset): boolean => (asset.alt?.trim().length ?? 0) >= MIN_ALT_TEXT;

const blockImages = (block: StoryBlock): { asset: MediaAsset; what: string }[] => {
  switch (block.type) {
    case 'hero':
      return block.data.image ? [{ asset: block.data.image, what: 'the image' }] : [];
    case 'image':
      return [{ asset: block.data.image, what: 'the image' }];
    case 'gallery':
      return block.data.images.map((item, index) => ({
        asset: item.image,
        what: `photo ${index + 1}`,
      }));
    default:
      return [];
  }
};

const blockName = (block: { type?: unknown }, index: number): string => {
  const label = STORY_BLOCK_LABELS[block.type as StoryBlockType] as string | undefined;
  return label ? `Block ${index + 1} (${label})` : `Block ${index + 1}`;
};

const blockProblems = (raw: unknown, index: number): { problems: string[]; block?: StoryBlock } => {
  const parsed = storyBlockSchema.safeParse(raw);
  const name = blockName((raw ?? {}) as { type?: unknown }, index);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { problems: [`${name} is incomplete: ${issue?.message ?? 'check its fields'}.`] };
  }
  const problems = blockImages(parsed.data)
    .filter(({ asset }) => !hasAltText(asset))
    .map(({ what }) => `${name}: describe ${what} (alt text) for people who cannot see it.`);
  return { problems, block: parsed.data };
};

/**
 * Everything that stops a story being published, as sentences an editor can
 * act on. Empty means it can go live.
 *
 * Needs an excerpt, at least one block, every block complete, a cover image
 * or a hero image to lead with, and a description (alt text) on the cover and
 * on every hero, image and gallery picture.
 */
export const storyPublishProblems = (story: StoryPublishCandidate): string[] => {
  const problems: string[] = [];
  if ((story.excerpt?.trim().length ?? 0) < 10) {
    problems.push('Write a short excerpt for the story list and link previews.');
  }
  const rawBlocks = story.blocks ?? [];
  if (rawBlocks.length === 0) {
    problems.push('Add at least one block.');
  }
  const checked = rawBlocks.map(blockProblems);
  const blocks = checked.flatMap((result) => (result.block ? [result.block] : []));
  if (!hasUniqueIds(blocks)) {
    problems.push('Two blocks share an id. Remove one and add it again.');
  }
  if (story.cover && !hasAltText(story.cover)) {
    problems.push('Describe the cover image (alt text) for people who cannot see it.');
  }
  const heroImage = blocks.some((block) => block.type === 'hero' && block.data.image);
  if (!story.cover && !heroImage) {
    problems.push('Add a cover image, or an image to the hero block.');
  }
  return [...problems, ...checked.flatMap((result) => result.problems)];
};

/** The parts of a project a story is prefilled from. A `Project` fits as it is. */
export interface StoryProjectSource {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description?: string;
  cover?: MediaAsset | null;
  metrics?: readonly Pick<ProjectMetric, 'label' | 'value' | 'suffix'>[];
  partners?: readonly Pick<ProjectPartner, 'name' | 'url'>[];
  media?: readonly Pick<ProjectMediaItem, 'image' | 'caption' | 'shareable'>[];
  programme?: ProgrammeKey | null;
  country?: string;
  tags?: readonly string[];
}

// Room for the suffix inside the 120-character slug limit.
const STORY_SLUG_SUFFIX = '-story';
const MAX_METRIC_ITEMS = 8;
const MAX_GALLERY_IMAGES = 24;
const MAX_PARTNER_ITEMS = 24;

const copyAsset = (asset: MediaAsset): MediaAsset => ({ ...asset });

const storySlugFor = (projectSlug: string): string =>
  `${projectSlug.slice(0, 120 - STORY_SLUG_SUFFIX.length).replace(/-+$/, '')}${STORY_SLUG_SUFFIX}`;

const heroBlockFor = (project: StoryProjectSource): StoryBlock => {
  const pillar = PILLARS.find((candidate) => candidate.key === project.programme);
  const data: StoryBlockData<'hero'> = {
    heading: project.title,
    subheading: truncate(project.summary, 300),
  };
  if (pillar) data.eyebrow = truncate(pillar.title, 60);
  if (project.cover) data.image = copyAsset(project.cover);
  return { id: newStableId('hero'), type: 'hero', data };
};

const optionalBlocksFor = (project: StoryProjectSource): StoryBlock[] => {
  const blocks: StoryBlock[] = [];
  const description = project.description?.trim() ?? '';
  if (description) {
    blocks.push({ id: newStableId('text'), type: 'rich-text', data: { markdown: description } });
  }
  const metrics = (project.metrics ?? []).slice(0, MAX_METRIC_ITEMS);
  if (metrics.length > 0) {
    const items = metrics.map(({ label, value, suffix }) =>
      suffix ? { label, value, suffix } : { label, value },
    );
    blocks.push({
      id: newStableId('numbers'),
      type: 'metrics',
      data: { heading: 'Results so far', items },
    });
  }
  // Only photos marked shareable: that flag records consent from the people in them.
  const photos = (project.media ?? [])
    .filter((item) => item.shareable === true)
    .slice(0, MAX_GALLERY_IMAGES);
  if (photos.length > 0) {
    const images = photos.map(({ image, caption }) =>
      caption ? { image: copyAsset(image), caption } : { image: copyAsset(image) },
    );
    blocks.push({ id: newStableId('gallery'), type: 'gallery', data: { images } });
  }
  const partners = (project.partners ?? []).slice(0, MAX_PARTNER_ITEMS);
  if (partners.length > 0) {
    const items = partners.map(({ name, url }) => (url ? { name, url } : { name }));
    blocks.push({
      id: newStableId('partners'),
      type: 'partners',
      data: { heading: 'Our partners', items },
    });
  }
  return blocks;
};

/**
 * A draft story prefilled from a project: its title, summary, cover, a hero,
 * the description as text, its numbers, its shareable photos and its
 * partners.
 *
 * Everything is copied, never referenced, so the story is free to diverge.
 * Internal material stays behind: risks, documents, people, progress and any
 * photo not marked shareable.
 */
export const storyFromProject = (project: StoryProjectSource): ImpactStoryInput => {
  const story: ImpactStoryInput = {
    title: project.title,
    slug: storySlugFor(project.slug),
    excerpt: project.summary,
    projectId: project.id,
    blocks: [heroBlockFor(project), ...optionalBlocksFor(project)],
    tags: [...(project.tags ?? [])],
  };
  if (project.cover) story.cover = copyAsset(project.cover);
  if (project.country) story.country = project.country;
  if (project.programme) story.programme = project.programme;
  return story;
};
