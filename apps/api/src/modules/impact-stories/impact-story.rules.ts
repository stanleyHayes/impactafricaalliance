import {
  canTransitionImpactStory,
  IMPACT_STORY_TRANSITIONS,
  isSafeLink,
  PROGRAMME_KEYS,
  storyPublishProblems,
  type AuditAction,
  type ImpactStoryStatus,
  type StoryProjectSource,
  type StoryPublishCandidate,
} from '@iaa/shared';
import type { Types } from 'mongoose';

import { ConflictError, ForbiddenError, ValidationError } from '../../common/errors.js';
import type { ProjectRecord } from '../projects/project.model.js';

/**
 * The decisions behind the impact story endpoints, kept apart from the
 * database so each rule can be tested on its own.
 */

/** How a status reads in a message or an activity line. */
export const STORY_STATUS_LABELS: Record<ImpactStoryStatus, string> = {
  draft: 'Draft',
  'in-review': 'In review',
  published: 'Published',
  archived: 'Archived',
};

/** Longest slug `slugSchema` accepts. */
const SLUG_MAX_LENGTH = 120;

/**
 * Refuse a status move this person may not make, or one that would put an
 * unfinished story on the site. Moving to the status a story already has is
 * not refused: the caller treats it as done, so a retried request (the admin
 * client repeats a PATCH after a dropped connection) does not fail.
 *
 * - A move the workflow does not allow at all is a 409: it conflicts with
 *   where the story is now, not with who is asking.
 * - A move only an administrator may make is a 403 (plan D2).
 * - Publishing with problems is a 400 listing each one, so the editor can fix
 *   them without guessing.
 */
export const assertStoryMove = (
  story: StoryPublishCandidate & { status: ImpactStoryStatus },
  to: ImpactStoryStatus,
  { isAdmin }: { isAdmin: boolean },
): void => {
  const from = story.status;
  if (from === to) {
    return;
  }
  if (!IMPACT_STORY_TRANSITIONS[from].includes(to)) {
    throw new ConflictError(
      `A story cannot move from ${STORY_STATUS_LABELS[from]} to ${STORY_STATUS_LABELS[to]}.`,
    );
  }
  if (!canTransitionImpactStory(from, to, { isAdmin })) {
    throw new ForbiddenError('Only an administrator can publish, unpublish or archive a story.');
  }
  if (to === 'published') {
    assertPublishable(story, 'This story is not ready to publish');
  }
};

/**
 * Refuse a story that `storyPublishProblems` finds fault with. Used before
 * publishing, and before saving an edit to a story that is already live, so
 * the public page can never lose its cover or a picture's description.
 */
export const assertPublishable = (story: StoryPublishCandidate, message: string): void => {
  const problems = storyPublishProblems(story);
  if (problems.length > 0) {
    throw new ValidationError(
      message,
      problems.map((problem) => ({ path: 'story', message: problem })),
    );
  }
};

/** What the activity log says about a status move. */
export const statusAuditEntry = (
  from: ImpactStoryStatus,
  to: ImpactStoryStatus,
  { firstPublication }: { firstPublication: boolean },
): { action: AuditAction; summary: string } => {
  if (to === 'published') {
    return {
      action: 'published',
      summary: firstPublication ? 'Published on the website' : 'Published on the website again',
    };
  }
  if (to === 'archived') {
    return {
      action: 'archived',
      summary: from === 'published' ? 'Archived and taken off the website' : 'Archived',
    };
  }
  if (from === 'published') {
    return { action: 'unpublished', summary: 'Taken off the website and returned to draft' };
  }
  if (from === 'archived') {
    return { action: 'restored', summary: 'Restored from the archive as a draft' };
  }
  return { action: 'status-changed', summary: `Moved to ${STORY_STATUS_LABELS[to]}` };
};

/** A stored project as read with `lean()`. */
export type StoredProject = ProjectRecord & { _id: Types.ObjectId };

/**
 * The parts of a stored project a story may start from.
 *
 * Only what `storyFromProject` reads is copied across, and only in a shape a
 * story can hold: a programme that has since left the list, or a partner link
 * a public page could not carry, is left behind rather than failing the
 * whole draft. Whether a photo is shareable is passed through untouched;
 * `storyFromProject` is what drops the photos nobody cleared for public use.
 */
export const projectStorySource = (project: StoredProject): StoryProjectSource => ({
  id: project._id.toString(),
  title: project.title,
  slug: project.slug,
  summary: project.summary,
  description: project.description,
  cover: project.cover ?? null,
  metrics: (project.metrics ?? []).map(({ label, value, suffix }) =>
    suffix ? { label, value, suffix } : { label, value },
  ),
  partners: (project.partners ?? []).map(({ name, url }) =>
    url && isSafeLink(url) ? { name, url } : { name },
  ),
  media: (project.media ?? []).map(({ image, caption, shareable }) =>
    caption ? { image, caption, shareable } : { image, shareable },
  ),
  programme:
    project.programme && PROGRAMME_KEYS.includes(project.programme) ? project.programme : null,
  ...(project.country ? { country: project.country } : {}),
  tags: project.tags ?? [],
});

/** `base` with `-<n>` on the end, cut so the whole still fits a slug. */
export const suffixedSlug = (base: string, n: number): string => {
  if (n <= 1) {
    return base;
  }
  const suffix = `-${n}`;
  return `${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`;
};

/**
 * The first of `base`, `base-2`, `base-3`… that no story uses yet. A second
 * story from the same project is expected (a year-one and a year-two story),
 * so a clash is resolved rather than refused.
 */
export const firstFreeSlug = (base: string, taken: ReadonlySet<string>): string => {
  let n = 1;
  while (taken.has(suffixedSlug(base, n))) {
    n += 1;
  }
  return suffixedSlug(base, n);
};
