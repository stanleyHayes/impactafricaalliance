import { describe, expect, it } from 'vitest';

import { resourceErrorStep, resourceFormSteps, usesResourceFormPage } from './form-steps';
import { findResource, RESOURCES } from './registry';
import type { FieldConfig } from './types';

const fields = (names: string[]): FieldConfig[] =>
  names.map((name) => ({ name, label: name, type: 'text' }));

describe('resource form steps', () => {
  it('uses dedicated pages only when there are more than five meaningful fields', () => {
    expect(usesResourceFormPage({ fields: fields(['a', 'b', 'c', 'd', 'e']) })).toBe(false);
    expect(usesResourceFormPage({ fields: fields(['a', 'b', 'c', 'd', 'e', 'f']) })).toBe(true);
  });

  it('retains new fields once each without overcrowding existing editorial groups', () => {
    const resource = {
      key: 'articles',
      fields: fields([
        'title',
        'slug',
        'excerpt',
        'body',
        'status',
        'tags',
        'coverImage',
        'autoPostToSocial',
        'future1',
        'future2',
        'future3',
        'future4',
        'future5',
        'future6',
      ]),
    };
    const steps = resourceFormSteps(resource);
    expect(steps[0]?.fields.map((field) => field.name)).toEqual(['title', 'slug', 'tags']);
    expect(steps.flatMap((step) => step.fields.map((field) => field.name)).sort()).toEqual(
      resource.fields.map((field) => field.name).sort(),
    );
    expect(steps.every((step) => step.fields.length <= 5)).toBe(true);
    expect(steps.at(-1)).toEqual({ label: 'Review', fields: [] });
  });

  it('routes errors back to the first affected section', () => {
    const steps = resourceFormSteps({
      key: 'articles',
      fields: fields(['title', 'body', 'coverImage']),
    });
    expect(resourceErrorStep(steps, ['coverImage', 'body'])).toBe(1);
    expect(resourceErrorStep(steps, ['unknown'])).toBe(0);
  });
});

describe('every CMS resource on a dedicated page', () => {
  const paged = RESOURCES.filter(usesResourceFormPage).map(
    (resource) => [resource.key, resource] as const,
  );

  it('covers the resources that have more than five fields', () => {
    expect(paged.map(([key]) => key)).toEqual(expect.arrayContaining(['team', 'announcements']));
  });

  // A field missing from the step groups lands in an auto-generated "More
  // details" step, which tells the person nothing about what is in it.
  it.each(paged)('%s puts every field in a named step of at most five', (_key, resource) => {
    const steps = resourceFormSteps(resource).slice(0, -1);
    expect(steps.map((step) => step.label).filter((label) => /more details/i.test(label))).toEqual(
      [],
    );
    expect(steps.every((step) => step.fields.length > 0 && step.fields.length <= 5)).toBe(true);
    expect(steps.flatMap((step) => step.fields.map((field) => field.name)).sort()).toEqual(
      resource.fields.map((field) => field.name).sort(),
    );
  });
});

describe('team steps', () => {
  it('splits the profile links from social media, with every link named', () => {
    const team = findResource('team');
    if (!team) throw new Error('No team resource');
    const steps = resourceFormSteps(team);
    expect(steps.map((step) => step.label)).toEqual([
      'Profile',
      'About',
      'Profile links',
      'Social media',
      'Visibility',
      'Review',
    ]);
    expect(steps[2]?.fields.map((field) => field.name)).toEqual([
      'websiteUrl',
      'linkedInUrl',
      'githubUrl',
    ]);
    expect(steps[3]?.fields.map((field) => field.name)).toEqual([
      'xUrl',
      'instagramUrl',
      'facebookUrl',
      'tiktokUrl',
    ]);
  });
});

describe('popup steps', () => {
  it('names each step for what it holds, with the picture beside its timing', () => {
    const popups = findResource('popups');
    if (!popups) throw new Error('No popups resource');
    const steps = resourceFormSteps(popups);
    expect(steps.map((step) => step.label)).toEqual([
      'Message',
      'Picture and timing',
      'Publishing',
      'Review',
    ]);
    expect(steps[1]?.fields.map((field) => field.name)).toContain('imageUrl');
  });
});
