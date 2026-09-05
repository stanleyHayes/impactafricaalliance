import { describe, expect, it } from 'vitest';

import { resourceErrorStep, resourceFormSteps, usesResourceFormPage } from './form-steps';
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
