import { describe, expect, it } from 'vitest';

import { type MediaAsset } from './common.js';
import {
  canTransitionImpactStory,
  emptyBlockData,
  IMPACT_STORY_STATUSES,
  IMPACT_STORY_VIEW_STATUSES,
  impactStoryInputSchema,
  impactStoryListQuerySchema,
  impactStoryUpdateSchema,
  isAdminStoryMove,
  safeLinkSchema,
  STORY_BLOCK_TYPES,
  storyBlockSchema,
  storyFromProject,
  storyPublishProblems,
  videoEmbedUrl,
  type ImpactStoryStatus,
  type StoryBlock,
} from './impact-story.js';
import { STABLE_ID_PATTERN } from './work.js';

const image = (name: string, alt?: string): MediaAsset => ({
  url: `https://res.cloudinary.com/iaa/image/upload/${name}.jpg`,
  publicId: `iaa/${name}`,
  ...(alt === undefined ? {} : { alt }),
});

describe('video links', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    [
      'https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=30',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    [
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    ['https://youtu.be/dQw4w9WgXcQ?t=10', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['http://youtu.be/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    [
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    [
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    [' https://vimeo.com/76979871 ', 'https://player.vimeo.com/video/76979871'],
    ['https://player.vimeo.com/video/76979871?h=abc', 'https://player.vimeo.com/video/76979871'],
    [
      'https://www.youtube.com/live/dQw4w9WgXcQ?si=abc',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ],
    // Unlisted Vimeo videos only play with their privacy hash.
    [
      'https://vimeo.com/76979871/3fa2b91c0d',
      'https://player.vimeo.com/video/76979871?h=3fa2b91c0d',
    ],
    [
      'https://player.vimeo.com/video/76979871?h=3FA2B91C0D&badge=0',
      'https://player.vimeo.com/video/76979871?h=3fa2b91c0d',
    ],
    ['https://vimeo.com/76979871/likes', 'https://player.vimeo.com/video/76979871'],
  ])('turns %s into an embed', (url, embed) => {
    expect(videoEmbedUrl(url)).toBe(embed);
  });

  it.each([
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ',
    'https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com.evil.example/76979871',
    'https://evil.example/?u=https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'https://vimeo.com/channels/staffpicks',
    'https://example.org/video.mp4',
    'javascript:alert(1)',
    'not a link',
  ])('refuses %s', (url) => {
    expect(videoEmbedUrl(url)).toBeNull();
  });
});

describe('links in a story', () => {
  it('accepts https and pages on this site', () => {
    expect(safeLinkSchema.parse(' https://impactafricaalliance.org/donate ')).toBe(
      'https://impactafricaalliance.org/donate',
    );
    expect(safeLinkSchema.safeParse('/get-involved').success).toBe(true);
    expect(safeLinkSchema.safeParse('/').success).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '//evil.example',
    '/\\evil.example',
    'http://example.org',
    'mailto:info@example.org',
    'get-involved',
    'https:///evil',
    '/two words',
    'data:text/html,<script>alert(1)</script>',
    // Reads as our site, opens evil.example.
    'https://impactafricaalliance.org@evil.example/donate',
    'https://user:secret@impactafricaalliance.org/donate',
    'https://evil.example\\@impactafricaalliance.org',
    'https://%%',
  ])('refuses %s', (link) => {
    expect(safeLinkSchema.safeParse(link).success).toBe(false);
  });

  it('still accepts an @ in the path, as in a profile link', () => {
    expect(safeLinkSchema.safeParse('https://medium.com/@impactafrica').success).toBe(true);
  });
});

describe('images in a story', () => {
  // These addresses end up in src and href attributes on the public site.
  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'http://example.org/a.jpg',
  ])('refuses an image at %s', (url) => {
    const block = { id: 'i', type: 'image', data: { image: { url, publicId: 'iaa/a' } } };
    expect(storyBlockSchema.safeParse(block).success).toBe(false);
    expect(
      impactStoryUpdateSchema.safeParse({ cover: { url, publicId: 'iaa/a', alt: 'Cover' } })
        .success,
    ).toBe(false);
  });
});

describe('story status changes', () => {
  const editor = { isAdmin: false };
  const admin = { isAdmin: true };

  it('lets an editor move a story in and out of review', () => {
    expect(canTransitionImpactStory('draft', 'in-review', editor)).toBe(true);
    expect(canTransitionImpactStory('in-review', 'draft', editor)).toBe(true);
    expect(canTransitionImpactStory('archived', 'draft', editor)).toBe(true);
  });

  it('keeps publishing, unpublishing and archiving for administrators', () => {
    expect(canTransitionImpactStory('in-review', 'published', editor)).toBe(false);
    expect(canTransitionImpactStory('published', 'draft', editor)).toBe(false);
    expect(canTransitionImpactStory('draft', 'archived', editor)).toBe(false);
    expect(canTransitionImpactStory('in-review', 'published', admin)).toBe(true);
    expect(canTransitionImpactStory('published', 'draft', admin)).toBe(true);
    expect(canTransitionImpactStory('published', 'archived', admin)).toBe(true);
  });

  it('never goes straight from archived to published, or nowhere', () => {
    expect(canTransitionImpactStory('archived', 'published', admin)).toBe(false);
    for (const status of IMPACT_STORY_STATUSES) {
      expect(canTransitionImpactStory(status, status, admin)).toBe(false);
    }
  });

  it.each<[ImpactStoryStatus, ImpactStoryStatus, boolean]>([
    ['draft', 'published', true],
    ['published', 'draft', true],
    ['in-review', 'archived', true],
    ['draft', 'in-review', false],
    ['archived', 'draft', false],
  ])('%s to %s needs an administrator: %s', (from, to, needsAdmin) => {
    expect(isAdminStoryMove(from, to)).toBe(needsAdmin);
  });

  it('shows stories in review among the drafts', () => {
    expect(IMPACT_STORY_VIEW_STATUSES.drafts).toEqual(['draft', 'in-review']);
    expect(IMPACT_STORY_VIEW_STATUSES.all).toEqual(IMPACT_STORY_STATUSES);
  });
});

describe('story blocks', () => {
  it('refuses a block type nobody can draw', () => {
    expect(storyBlockSchema.safeParse({ id: 'b1', type: 'carousel', data: {} }).success).toBe(
      false,
    );
  });

  it('refuses data that belongs to another type', () => {
    expect(
      storyBlockSchema.safeParse({ id: 'b1', type: 'hero', data: { text: 'A quote' } }).success,
    ).toBe(false);
  });

  it('accepts a complete block', () => {
    expect(
      storyBlockSchema.parse({
        id: 'q1',
        type: 'quote',
        data: { text: 'I built my first website here.', attribution: 'Abena', role: '' },
      }),
    ).toEqual({
      id: 'q1',
      type: 'quote',
      data: { text: 'I built my first website here.', attribution: 'Abena' },
    });
  });

  it('only embeds YouTube and Vimeo', () => {
    expect(
      storyBlockSchema.safeParse({
        id: 'v',
        type: 'video',
        data: { url: 'https://example.org/a.mp4' },
      }).success,
    ).toBe(false);
  });

  it('keeps call-to-action links safe', () => {
    const cta = (url: string) => ({
      id: 'c',
      type: 'cta',
      data: { heading: 'Join us', label: 'Volunteer', url },
    });
    expect(storyBlockSchema.safeParse(cta('/get-involved')).success).toBe(true);
    expect(storyBlockSchema.safeParse(cta('javascript:alert(1)')).success).toBe(false);
  });

  it('starts every block type with fresh, fillable data that is not yet valid', () => {
    for (const type of STORY_BLOCK_TYPES) {
      const first = emptyBlockData(type);
      expect(first).not.toBe(emptyBlockData(type));
      expect(storyBlockSchema.safeParse({ id: 'new', type, data: first }).success).toBe(false);
    }
  });
});

const completeBlocks = (): StoryBlock[] => [
  {
    id: 'hero',
    type: 'hero',
    data: { heading: 'Coding in Tamale', image: image('hero', 'Students at laptops') },
  },
  {
    id: 'photos',
    type: 'gallery',
    data: { images: [{ image: image('one', 'A trainer at a whiteboard') }] },
  },
];

describe('publishing a story', () => {
  const excerpt = 'How forty young people in Tamale learnt to build websites.';

  it('finds nothing wrong with a complete story', () => {
    expect(storyPublishProblems({ excerpt, blocks: completeBlocks() })).toEqual([]);
  });

  it('needs an excerpt, a block and an image to lead with', () => {
    expect(storyPublishProblems({ excerpt: '', blocks: [] })).toEqual([
      'Write a short excerpt for the story list and link previews.',
      'Add at least one block.',
      'Add a cover image, or an image to the hero block.',
    ]);
  });

  it('needs every image described', () => {
    const blocks = completeBlocks();
    const gallery = blocks[1];
    if (gallery?.type === 'gallery') {
      gallery.data.images.push({ image: image('two', 'x') });
    }
    expect(storyPublishProblems({ excerpt, cover: image('cover'), blocks })).toEqual([
      'Describe the cover image (alt text) for people who cannot see it.',
      'Block 2 (Gallery): describe photo 2 (alt text) for people who cannot see it.',
    ]);
  });

  it('checks the hero image too', () => {
    const blocks: StoryBlock[] = [
      { id: 'hero', type: 'hero', data: { heading: 'Coding in Tamale', image: image('hero') } },
    ];
    expect(storyPublishProblems({ excerpt, blocks })).toEqual([
      'Block 1 (Hero): describe the image (alt text) for people who cannot see it.',
    ]);
  });

  it('checks blocks from storage in full', () => {
    const problems = storyPublishProblems({
      excerpt,
      cover: image('cover', 'Graduation day'),
      blocks: [
        { id: 'q', type: 'quote', data: { text: '' } },
        { id: 'odd', type: 'banner' },
      ],
    });
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/^Block 1 \(Quote\) is incomplete/);
    expect(problems[1]).toMatch(/^Block 2 is incomplete/);
  });

  it('notices two blocks sharing an id', () => {
    const blocks = completeBlocks();
    blocks.push({ id: 'hero', type: 'rich-text', data: { markdown: 'More.' } });
    expect(storyPublishProblems({ excerpt, blocks })).toContain(
      'Two blocks share an id. Remove one and add it again.',
    );
  });
});

describe('story schemas', () => {
  it('does not inject create defaults into a partial edit, and null clears', () => {
    expect(impactStoryUpdateSchema.parse({ title: 'New title' })).toEqual({ title: 'New title' });
    expect(
      impactStoryUpdateSchema.parse({ seo: null, country: '', cover: null, projectId: null }),
    ).toEqual({ seo: null, country: null, cover: null, projectId: null });
  });

  it('opens the dashboard on drafts', () => {
    expect(impactStoryListQuerySchema.parse({}).view).toBe('drafts');
    expect(impactStoryListQuerySchema.safeParse({ view: 'secret' }).success).toBe(false);
  });

  it('refuses two blocks with the same id', () => {
    const block = { id: 'dup', type: 'rich-text', data: { markdown: 'Hello' } };
    expect(
      impactStoryInputSchema.safeParse({
        title: 'A story',
        slug: 'a-story',
        excerpt: 'Ten characters at least.',
        blocks: [block, block],
      }).success,
    ).toBe(false);
  });
});

describe('a story from a project', () => {
  const project = {
    id: '64b7f0c2a1b2c3d4e5f60718',
    title: 'Digital Skills Hub, Tamale',
    slug: 'digital-skills-hub-tamale',
    summary: 'Coding and e-commerce training for young people in the Northern Region.',
    description: '## What we did\n\nTwelve weeks of evening classes.',
    cover: image('cover', 'The hub at night'),
    programme: 'digital-skills',
    country: 'Ghana',
    tags: ['youth', 'coding'],
    metrics: Array.from({ length: 10 }, (_, index) => ({
      id: `m${index}`,
      label: `Metric ${index}`,
      value: index * 10,
      suffix: index === 0 ? '%' : undefined,
    })),
    partners: [
      { name: 'Tamale Tech Hub', url: 'https://tamaletech.example', role: 'Venue' },
      { name: 'Local council' },
    ],
    media: [
      {
        image: image('shareable', 'Students coding'),
        caption: 'Week six',
        shareable: true,
        addedBy: { id: 'u1', name: 'Kofi', email: 'kofi@iaa.example', role: 'editor' },
      },
      { image: image('private', "A student's ID card"), shareable: false },
    ],
    // Internal material that must never reach a story.
    risks: [{ id: 'r1', title: 'Funding gap in Q3', level: 'high', status: 'open' }],
    documents: [{ id: 'd1', name: 'Budget.xlsx' }],
    members: [{ id: 'u2', name: 'Private Person', email: 'private@iaa.example' }],
    progressOverride: { value: 80, reason: 'Board asked us to report this' },
  };

  const story = storyFromProject(project);
  const json = JSON.stringify(story);

  it('makes a story the schema accepts', () => {
    expect(impactStoryInputSchema.safeParse(story).success).toBe(true);
    for (const block of story.blocks) {
      expect(block.id).toMatch(STABLE_ID_PATTERN);
    }
  });

  it('prefills the title, excerpt, slug, classification and link to the project', () => {
    expect(story).toMatchObject({
      title: project.title,
      excerpt: project.summary,
      slug: 'digital-skills-hub-tamale-story',
      projectId: project.id,
      country: 'Ghana',
      programme: 'digital-skills',
      tags: ['youth', 'coding'],
    });
    expect(story.blocks.map((block) => block.type)).toEqual([
      'hero',
      'rich-text',
      'metrics',
      'gallery',
      'partners',
    ]);
  });

  it('uses only photos marked shareable', () => {
    const gallery = story.blocks.find((block) => block.type === 'gallery');
    expect(gallery?.type === 'gallery' && gallery.data.images).toEqual([
      { image: image('shareable', 'Students coding'), caption: 'Week six' },
    ]);
    expect(json).not.toContain('private');
  });

  it('leaves internal material behind', () => {
    expect(json).not.toContain('Funding gap');
    expect(json).not.toContain('Budget.xlsx');
    expect(json).not.toContain('Board asked');
    expect(json).not.toContain('kofi@iaa.example');
    expect(json).not.toContain('Venue');
  });

  it('keeps at most eight numbers', () => {
    const metrics = story.blocks.find((block) => block.type === 'metrics');
    expect(metrics?.type === 'metrics' && metrics.data.items).toHaveLength(8);
  });

  it('copies rather than references, so the story can change on its own', () => {
    if (story.cover) story.cover.alt = 'Changed in the story';
    const hero = story.blocks[0];
    if (hero?.type === 'hero' && hero.data.image) {
      hero.data.image.alt = 'Also changed';
    }
    const gallery = story.blocks.find((block) => block.type === 'gallery');
    if (gallery?.type === 'gallery' && gallery.data.images[0]) {
      gallery.data.images[0].image.alt = 'Changed in the gallery';
    }
    story.tags.push('edited');
    expect(project.cover?.alt).toBe('The hub at night');
    expect(project.media[0]?.image.alt).toBe('Students coding');
    expect(project.tags).toEqual(['youth', 'coding']);
  });

  it('skips the text block when there is no description, and fits a long slug', () => {
    const short = storyFromProject({
      id: project.id,
      title: 'Short',
      slug: `${'a'.repeat(118)}-b`,
      summary: 'A summary that is long enough.',
      description: '   ',
    });
    expect(short.blocks.map((block) => block.type)).toEqual(['hero']);
    expect(short.slug.length).toBeLessThanOrEqual(120);
    expect(impactStoryInputSchema.safeParse(short).success).toBe(true);
  });
});
