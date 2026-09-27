import { describe, expect, it } from 'vitest';

import {
  blockFieldErrors,
  blockProblems,
  checkStoryStep,
  emptyStoryForm,
  firstStepWithProblems,
  newBlock,
  storyCreateBody,
  storyUpdateBody,
  type StoryBlockDraft,
  type StoryFormState,
} from './story-form';

const image = { url: 'https://res.cloudinary.com/iaa/image/upload/a.jpg', publicId: 'iaa/a' };

const readyForm = (): StoryFormState => ({
  ...emptyStoryForm(),
  title: 'Girls in code',
  slug: 'girls-in-code',
  excerpt: 'How forty girls wrote their first programs.',
  blocks: [{ id: 'text-1', type: 'rich-text', data: { markdown: 'It began with a laptop.' } }],
});

describe('checking one block', () => {
  it('starts every new block empty and incomplete', () => {
    for (const type of ['hero', 'image', 'video', 'quote', 'cta'] as const) {
      expect(blockProblems(newBlock(type)).length).toBeGreaterThan(0);
    }
  });

  it('names the field and the row in plain words', () => {
    const metrics: StoryBlockDraft = {
      id: 'numbers-1',
      type: 'metrics',
      data: { items: [{ label: '', value: 40 }] },
    };
    expect(blockFieldErrors(metrics)).toEqual({ 'items.0.label': 'Number 1 · Label is required' });
  });

  it('explains a video link it cannot play and a button link it cannot carry', () => {
    const video: StoryBlockDraft = {
      id: 'v',
      type: 'video',
      data: { url: 'https://evil.example/x' },
    };
    expect(blockProblems(video)).toEqual(['Link: Use a YouTube or Vimeo link']);
    const cta: StoryBlockDraft = {
      id: 'c',
      type: 'cta',
      data: { heading: 'Join us', label: 'Volunteer', url: 'javascript:alert(1)' },
    };
    expect(blockProblems(cta)[0]).toMatch(/^Link: Use a link starting with https:\/\//);
  });

  it('passes a filled-in block', () => {
    const quote: StoryBlockDraft = {
      id: 'q',
      type: 'quote',
      data: { text: 'It changed my year.' },
    };
    expect(blockProblems(quote)).toEqual([]);
  });
});

describe('checking a step', () => {
  it('holds the Basics step until the title, address and excerpt are there', () => {
    const check = checkStoryStep(emptyStoryForm(), 0);
    expect(Object.keys(check.fields).sort()).toEqual(['excerpt', 'slug', 'title']);
  });

  it('keeps the story off an address the website already uses', () => {
    const check = checkStoryStep({ ...readyForm(), slug: 'preview' }, 0);
    expect(check.fields.slug).toMatch(/already uses \/impact\/stories\/preview/);
    expect(firstStepWithProblems({ ...readyForm(), slug: 'preview' })).toBe(0);
  });

  it('holds the Blocks step while any block is unfinished', () => {
    const form = { ...readyForm(), blocks: [...readyForm().blocks, newBlock('image')] };
    const check = checkStoryStep(form, 2);
    expect(check.fields.blocks).toBeDefined();
    expect(Object.keys(check.blocks)).toHaveLength(1);
  });

  it('finds the first step that needs attention before saving', () => {
    expect(firstStepWithProblems(readyForm())).toBeNull();
    expect(firstStepWithProblems({ ...readyForm(), seoTitle: 'x'.repeat(71) })).toBe(3);
    expect(firstStepWithProblems({ ...readyForm(), title: '' })).toBe(0);
  });
});

describe('what is sent', () => {
  it('leaves empty search settings out of a new story', () => {
    const body = storyCreateBody({ ...readyForm(), cover: image });
    expect(body).not.toHaveProperty('seo');
    expect(body.programme).toBeNull();
  });

  it('clears removed values explicitly when saving an edit', () => {
    const body = storyUpdateBody(readyForm());
    expect(body.seo).toBeNull();
    expect(body.country).toBeNull();
    expect(body.cover).toBeNull();
    expect(body.projectId).toBeNull();
  });
});
