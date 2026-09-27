import { storyFromProject, type MediaAsset } from '@iaa/shared';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, ValidationError } from '../../common/errors.js';

import {
  assertStoryMove,
  firstFreeSlug,
  projectStorySource,
  statusAuditEntry,
  suffixedSlug,
  type StoredProject,
} from './impact-story.rules.js';

const image = (name: string, alt = 'Girls at a coding club in Tamale'): MediaAsset => ({
  url: `https://res.cloudinary.com/iaa/image/upload/${name}.jpg`,
  publicId: `iaa/${name}`,
  alt,
});

const ready = {
  excerpt: 'How forty girls wrote their first programs.',
  cover: image('cover'),
  blocks: [{ id: 'text-1', type: 'rich-text', data: { markdown: 'It began with a laptop.' } }],
};

const editor = { isAdmin: false };
const admin = { isAdmin: true };

describe('who may move a story where', () => {
  it('lets an editor move between draft and review, and nothing further', () => {
    expect(() => assertStoryMove({ ...ready, status: 'draft' }, 'in-review', editor)).not.toThrow();
    expect(() => assertStoryMove({ ...ready, status: 'in-review' }, 'draft', editor)).not.toThrow();
    for (const [from, to] of [
      ['draft', 'published'],
      ['in-review', 'published'],
      ['in-review', 'archived'],
      ['published', 'draft'],
      ['published', 'archived'],
    ] as const) {
      expect(() => assertStoryMove({ ...ready, status: from }, to, editor)).toThrow(ForbiddenError);
    }
  });

  it('lets an editor bring an archived story back as a draft, which publishes nothing', () => {
    expect(() => assertStoryMove({ ...ready, status: 'archived' }, 'draft', editor)).not.toThrow();
  });

  it('lets an administrator publish, unpublish, archive and restore', () => {
    expect(() =>
      assertStoryMove({ ...ready, status: 'in-review' }, 'published', admin),
    ).not.toThrow();
    expect(() => assertStoryMove({ ...ready, status: 'published' }, 'draft', admin)).not.toThrow();
    expect(() =>
      assertStoryMove({ ...ready, status: 'published' }, 'archived', admin),
    ).not.toThrow();
    expect(() => assertStoryMove({ ...ready, status: 'archived' }, 'draft', admin)).not.toThrow();
  });

  it('refuses moves the workflow has no path for, whoever asks', () => {
    expect(() => assertStoryMove({ ...ready, status: 'archived' }, 'published', admin)).toThrow(
      ConflictError,
    );
    expect(() => assertStoryMove({ ...ready, status: 'published' }, 'in-review', admin)).toThrow(
      ConflictError,
    );
  });

  it('treats a move to the current status as already done', () => {
    expect(() =>
      assertStoryMove({ ...ready, status: 'published' }, 'published', editor),
    ).not.toThrow();
  });
});

describe('the publishing check', () => {
  it('lists every problem before a story goes public', () => {
    let caught: unknown;
    try {
      assertStoryMove(
        { excerpt: 'Too short', cover: image('cover', ''), blocks: [], status: 'in-review' },
        'published',
        admin,
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ValidationError);
    const details = (caught as ValidationError).details as { message: string }[];
    expect(details.map((detail) => detail.message)).toEqual([
      'Write a short excerpt for the story list and link previews.',
      'Add at least one block.',
      'Describe the cover image (alt text) for people who cannot see it.',
    ]);
  });

  it('checks the problems only on the way to published', () => {
    expect(() =>
      assertStoryMove({ excerpt: '', blocks: [], status: 'draft' }, 'in-review', editor),
    ).not.toThrow();
  });
});

describe('the activity line for a status move', () => {
  it('names publishing, unpublishing, archiving and restoring', () => {
    expect(statusAuditEntry('in-review', 'published', { firstPublication: true })).toEqual({
      action: 'published',
      summary: 'Published on the website',
    });
    expect(statusAuditEntry('draft', 'published', { firstPublication: false }).summary).toBe(
      'Published on the website again',
    );
    expect(statusAuditEntry('published', 'draft', { firstPublication: false }).action).toBe(
      'unpublished',
    );
    expect(statusAuditEntry('published', 'archived', { firstPublication: false })).toEqual({
      action: 'archived',
      summary: 'Archived and taken off the website',
    });
    expect(statusAuditEntry('archived', 'draft', { firstPublication: false }).action).toBe(
      'restored',
    );
    expect(statusAuditEntry('draft', 'in-review', { firstPublication: false })).toEqual({
      action: 'status-changed',
      summary: 'Moved to In review',
    });
  });
});

const storedProject = (overrides: Partial<StoredProject> = {}): StoredProject =>
  ({
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    title: 'Coding clubs in Tamale',
    slug: 'coding-clubs',
    summary: 'After-school coding clubs for girls in three schools.',
    description: 'The clubs met twice a week.',
    programme: 'digital-skills',
    country: 'Ghana',
    tags: ['girls'],
    cover: image('project-cover'),
    metrics: [{ id: 'girls', label: 'Girls taught', value: 40, suffix: '+' }],
    partners: [
      { name: 'Tamale Tech Hub', url: 'https://tamaletech.example' },
      { name: 'Old partner', url: 'javascript:alert(1)' },
    ],
    media: [
      {
        id: 'a',
        image: image('shared'),
        caption: 'Club day',
        shareable: true,
        addedAt: new Date(),
      },
      { id: 'b', image: image('private'), shareable: false, addedAt: new Date() },
    ],
    risks: [{ id: 'r', title: 'Funding may lapse', level: 'high', status: 'open' }],
    documents: [],
    ...overrides,
  }) as unknown as StoredProject;

describe('starting a story from a project', () => {
  it('copies only the photos cleared for public use', () => {
    const story = storyFromProject(projectStorySource(storedProject()));
    const gallery = story.blocks.find((block) => block.type === 'gallery');
    expect(
      gallery?.type === 'gallery' && gallery.data.images.map((item) => item.image.publicId),
    ).toEqual(['iaa/shared']);
    expect(story.projectId).toBe('507f1f77bcf86cd799439011');
    expect(story.slug).toBe('coding-clubs-story');
  });

  it('leaves out a programme that has left the list and a link a page cannot carry', () => {
    const source = projectStorySource(storedProject({ programme: 'retired-pillar' }));
    expect(source.programme).toBeNull();
    expect(source.partners).toEqual([
      { name: 'Tamale Tech Hub', url: 'https://tamaletech.example' },
      { name: 'Old partner' },
    ]);
  });

  it('never carries internal material across', () => {
    const source = projectStorySource(storedProject());
    expect(source).not.toHaveProperty('risks');
    expect(source).not.toHaveProperty('documents');
    expect(source.media?.every((item) => !('addedBy' in item))).toBe(true);
  });
});

describe('finding a free slug', () => {
  it('counts up from the second story', () => {
    expect(firstFreeSlug('clubs-story', new Set())).toBe('clubs-story');
    expect(firstFreeSlug('clubs-story', new Set(['clubs-story', 'clubs-story-2']))).toBe(
      'clubs-story-3',
    );
  });

  it('keeps a long slug inside the limit', () => {
    const long = `${'a'.repeat(118)}-b`;
    const next = suffixedSlug(long, 12);
    expect(next.length).toBeLessThanOrEqual(120);
    expect(next.endsWith('-12')).toBe(true);
    expect(next).not.toContain('--');
  });
});
