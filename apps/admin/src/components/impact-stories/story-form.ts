import {
  impactStoryInputSchema,
  isReservedStorySlug,
  newStableId,
  STORY_BLOCK_DATA_SCHEMAS,
  STORY_BLOCK_LABELS,
  storyPublishProblems,
  emptyBlockData,
  type ImpactStory,
  type ImpactStoryInput,
  type ImpactStoryUpdate,
  type MediaAsset,
  type ProjectRef,
  type StoryBlockData,
  type StoryBlockType,
} from '@iaa/shared';
import type { z } from 'zod';

/**
 * The story editor's working copy and the checks behind each step.
 *
 * Blocks are held as drafts: a block just added from the menu is empty and
 * does not pass its schema until it is filled in, so the editor keeps
 * partial data and checks it before Continue and before saving.
 */

/** A block being edited: its data may be incomplete. */
export type StoryBlockDraft = {
  [T in StoryBlockType]: { id: string; type: T; data: Partial<StoryBlockData<T>> };
}[StoryBlockType];

/** One block type's draft, for the editor that fills it in. */
export type StoryBlockDraftOf<T extends StoryBlockType> = Extract<StoryBlockDraft, { type: T }>;

export const STORY_FORM_STEPS = [
  'Basics',
  'Classification',
  'Blocks',
  'Search & sharing',
  'Review',
] as const;

export const REVIEW_STEP = STORY_FORM_STEPS.length - 1;

/** What search engines show before they cut a title or description short. */
export const SEO_TITLE_LIMIT = 70;
export const SEO_DESCRIPTION_LIMIT = 160;

export interface StoryFormState {
  title: string;
  slug: string;
  /** Once someone edits the slug by hand, the title stops rewriting it. */
  slugTouched: boolean;
  excerpt: string;
  cover: MediaAsset | null;
  projectId: string | null;
  /** The linked project's name, so the picker can show it before any search. */
  project: ProjectRef | null;
  programme: string;
  country: string;
  tags: string[];
  blocks: StoryBlockDraft[];
  seoTitle: string;
  seoDescription: string;
  seoImage: MediaAsset | null;
}

export const emptyStoryForm = (): StoryFormState => ({
  title: '',
  slug: '',
  slugTouched: false,
  excerpt: '',
  cover: null,
  projectId: null,
  project: null,
  programme: '',
  country: '',
  tags: [],
  blocks: [],
  seoTitle: '',
  seoDescription: '',
  seoImage: null,
});

export const storyToForm = (story: ImpactStory): StoryFormState => ({
  title: story.title,
  slug: story.slug,
  // An existing story's address may already be shared, so a retitle never moves it.
  slugTouched: true,
  excerpt: story.excerpt,
  cover: story.cover ?? null,
  projectId: story.projectId ?? null,
  project: story.project ?? null,
  programme: story.programme ?? '',
  country: story.country ?? '',
  tags: [...story.tags],
  blocks: story.blocks.map((block) => ({ ...block }) as StoryBlockDraft),
  seoTitle: story.seo?.title ?? '',
  seoDescription: story.seo?.description ?? '',
  seoImage: story.seo?.image ?? null,
});

/** A new, empty block of one type, as the "Add block" menu makes it. */
export const newBlock = (type: StoryBlockType): StoryBlockDraft =>
  ({ id: newStableId(type), type, data: emptyBlockData(type) }) as StoryBlockDraft;

/** A copy of a block with its own id, so the two can be edited apart. */
export const duplicateBlock = (block: StoryBlockDraft): StoryBlockDraft =>
  ({
    id: newStableId(block.type),
    type: block.type,
    data: JSON.parse(JSON.stringify(block.data)) as unknown,
  }) as StoryBlockDraft;

/** "Block 3 (Quote)", as the publishing checklist names blocks. */
export const blockName = (block: Pick<StoryBlockDraft, 'type'>, index: number): string =>
  `Block ${index + 1} (${STORY_BLOCK_LABELS[block.type]})`;

const FIELD_LABELS: Record<string, string> = {
  eyebrow: 'Eyebrow',
  heading: 'Heading',
  subheading: 'Subheading',
  markdown: 'Text',
  image: 'Image',
  images: 'Photos',
  caption: 'Caption',
  url: 'Link',
  text: 'Quote',
  attribution: 'Who said it',
  role: 'Their role',
  photo: 'Photo',
  items: 'Rows',
  label: 'Label',
  value: 'Number',
  suffix: 'Suffix',
  title: 'Title',
  description: 'Description',
  name: 'Name',
  logo: 'Logo',
  body: 'Text',
  alt: 'Alt text',
};

// What each list row is called, so a problem reads "Step 2: Title is required".
const ROW_NOUNS: Partial<Record<StoryBlockType, string>> = {
  gallery: 'Photo',
  metrics: 'Number',
  timeline: 'Step',
  partners: 'Partner',
};

const fieldName = (type: StoryBlockType, path: readonly PropertyKey[]): string => {
  const parts: string[] = [];
  path.forEach((segment, index) => {
    if (typeof segment === 'number') {
      parts.push(`${ROW_NOUNS[type] ?? 'Item'} ${segment + 1}`);
    } else if (index === path.length - 1 || typeof path[index + 1] !== 'number') {
      parts.push(FIELD_LABELS[String(segment)] ?? String(segment));
    }
  });
  return parts.join(' · ') || 'This block';
};

type Issue = z.core.$ZodIssue;

// Zod's own wording is written for developers; these are for editors.
const issueText = (issue: Issue): string => {
  if (issue.code === 'invalid_type') {
    return 'is required';
  }
  if (issue.code === 'too_small') {
    if (issue.origin === 'array') {
      return `needs at least ${String(issue.minimum)}`;
    }
    return Number(issue.minimum) <= 1
      ? 'is required'
      : `needs at least ${String(issue.minimum)} characters`;
  }
  if (issue.code === 'too_big') {
    return issue.origin === 'array'
      ? `can have at most ${String(issue.maximum)}`
      : `must be ${String(issue.maximum)} characters or fewer`;
  }
  return issue.message;
};

const issueSentence = (type: StoryBlockType, issue: Issue): string => {
  const text = issueText(issue);
  // A custom message is already a sentence, such as "Use a YouTube or Vimeo link".
  const name = fieldName(type, issue.path);
  return /^[A-Z]/.test(text) ? `${name}: ${text}` : `${name} ${text}`;
};

/**
 * Each field's first problem, keyed by its path (`heading`, `items.0.label`),
 * for the block's own inputs to show as helper text.
 */
export const blockFieldErrors = (block: StoryBlockDraft): Record<string, string> => {
  const result = STORY_BLOCK_DATA_SCHEMAS[block.type].safeParse(block.data);
  if (result.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join('.');
    errors[key] ??= issueSentence(block.type, issue);
  }
  return errors;
};

/** Every problem in one block, as sentences for the card's summary. */
export const blockProblems = (block: StoryBlockDraft): string[] => [
  ...new Set(Object.values(blockFieldErrors(block))),
];

export type StoryFieldErrors = Partial<
  Record<
    'title' | 'slug' | 'excerpt' | 'cover' | 'programme' | 'country' | 'tags' | 'blocks' | 'seo',
    string
  >
>;

export interface StoryStepCheck {
  fields: StoryFieldErrors;
  /** Block id → its problems. */
  blocks: Record<string, string[]>;
}

const FIELD_STEPS: Record<keyof StoryFieldErrors | 'projectId', number> = {
  title: 0,
  slug: 0,
  excerpt: 0,
  cover: 0,
  projectId: 1,
  programme: 1,
  country: 1,
  tags: 1,
  blocks: 2,
  seo: 3,
};

const seoFrom = (form: StoryFormState): ImpactStoryInput['seo'] => {
  const seo = {
    ...(form.seoTitle.trim() ? { title: form.seoTitle.trim() } : {}),
    ...(form.seoDescription.trim() ? { description: form.seoDescription.trim() } : {}),
    ...(form.seoImage ? { image: form.seoImage } : {}),
  };
  return Object.keys(seo).length > 0 ? seo : undefined;
};

/** The body for `POST /admin/impact-stories`. */
export const storyCreateBody = (form: StoryFormState): ImpactStoryInput => {
  const seo = seoFrom(form);
  return {
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    cover: form.cover,
    projectId: form.projectId,
    blocks: form.blocks as ImpactStoryInput['blocks'],
    tags: form.tags,
    country: form.country,
    programme: form.programme || null,
    ...(seo ? { seo } : {}),
  };
};

/**
 * The body for `PATCH /admin/impact-stories/:id`: the whole story, with null
 * for every optional value that was removed, because a missing key means
 * "leave it as it was".
 */
export const storyUpdateBody = (form: StoryFormState): ImpactStoryUpdate => ({
  ...storyCreateBody(form),
  country: form.country.trim() || null,
  seo: seoFrom(form) ?? null,
});

const messageFor = (issue: Issue): string => {
  const key = String(issue.path[0] ?? '');
  const labels: Record<string, string> = {
    title: 'The title',
    slug: 'The web address',
    excerpt: 'The excerpt',
    country: 'The country',
    tags: 'Each tag',
  };
  return `${labels[key] ?? 'This field'} ${issueText(issue)}.`;
};

/** Field problems for one step, from the same schema the API applies. */
const schemaFieldErrors = (form: StoryFormState, step: number): StoryFieldErrors => {
  const result = impactStoryInputSchema.safeParse({ ...storyCreateBody(form), blocks: [] });
  const fields: StoryFieldErrors = {};
  if (result.success) {
    return fields;
  }
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '') as keyof StoryFieldErrors;
    if (FIELD_STEPS[key] === step && !fields[key]) {
      fields[key] = key === 'seo' ? seoMessage(issue) : messageFor(issue);
    }
  }
  return fields;
};

const seoMessage = (issue: Issue): string => {
  const part = String(issue.path[1] ?? '');
  if (part === 'title') return `Keep the search title to ${SEO_TITLE_LIMIT} characters or fewer.`;
  if (part === 'description') {
    return `Keep the search description to ${SEO_DESCRIPTION_LIMIT} characters or fewer.`;
  }
  return 'Check the search and sharing settings.';
};

/** Problems that stop the reader leaving `step`. */
export const checkStoryStep = (form: StoryFormState, step: number): StoryStepCheck => {
  const fields = schemaFieldErrors(form, step);
  // The API refuses these too; saying so here keeps the reader on Basics.
  if (step === FIELD_STEPS.slug && !fields.slug && isReservedStorySlug(form.slug)) {
    fields.slug = `The website already uses /impact/stories/${form.slug.trim()}. Choose a different web address.`;
  }
  const blocks: Record<string, string[]> = {};
  if (step === 2) {
    for (const block of form.blocks) {
      const problems = blockProblems(block);
      if (problems.length > 0) blocks[block.id] = problems;
    }
    if (Object.keys(blocks).length > 0) {
      fields.blocks = 'Finish or remove the blocks marked below before you continue.';
    }
  }
  return { fields, blocks };
};

export const hasStoryProblems = (check: StoryStepCheck): boolean =>
  Object.keys(check.fields).length > 0 || Object.keys(check.blocks).length > 0;

/** The first step with a problem, or null when the whole story can be saved. */
export const firstStepWithProblems = (form: StoryFormState): number | null => {
  for (let step = 0; step < REVIEW_STEP; step += 1) {
    if (hasStoryProblems(checkStoryStep(form, step))) {
      return step;
    }
  }
  return null;
};

/** The publishing checklist for the Review step (the API applies the same rule). */
export const storyFormPublishProblems = (form: StoryFormState): string[] =>
  storyPublishProblems({ excerpt: form.excerpt, cover: form.cover, blocks: form.blocks });
