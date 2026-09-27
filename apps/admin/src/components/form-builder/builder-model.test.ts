import { FORM_OPTION_VALUE_PATTERN, STABLE_ID_PATTERN, type FormStep } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import {
  duplicateField,
  moveItem,
  newField,
  newStep,
  operatorsFor,
  optionValueFor,
  problemsForField,
  questionsBefore,
  syncOptions,
} from './builder-model';

describe('option values', () => {
  it('are made from the label, in the shape the API accepts, and never repeat', () => {
    expect(optionValueFor('Côte d’Ivoire', new Set())).toBe('cote-divoire');
    expect(optionValueFor('Women’s empowerment & mentorship', new Set())).toBe(
      'womens-empowerment-mentorship',
    );
    expect(optionValueFor('!!!', new Set())).toBe('option');
    expect(optionValueFor('Yes', new Set(['yes', 'yes-2']))).toBe('yes-3');
    const long = optionValueFor('a'.repeat(300), new Set());
    expect(long).toMatch(FORM_OPTION_VALUE_PATTERN);
  });

  it('stay the same when an option is renamed, so earlier answers still match', () => {
    const previous = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];
    expect(syncOptions('Yes, please\nNo', previous)).toEqual([
      { value: 'yes', label: 'Yes, please' },
      { value: 'no', label: 'No' },
    ]);
  });

  it('follow their option when options are reordered or one is removed', () => {
    const previous = [
      { value: 'red', label: 'Red' },
      { value: 'green', label: 'Green' },
      { value: 'blue', label: 'Blue' },
    ];
    expect(syncOptions('Blue\nRed', previous)).toEqual([
      { value: 'blue', label: 'Blue' },
      { value: 'red', label: 'Red' },
    ]);
    expect(syncOptions('Red\nBlue', previous)).toEqual([
      { value: 'red', label: 'Red' },
      { value: 'blue', label: 'Blue' },
    ]);
  });

  it('give a new option its own value, and ignore blank lines while typing', () => {
    const previous = [{ value: 'yes', label: 'Yes' }];
    expect(syncOptions('Yes\n\n', previous)).toEqual(previous);
    expect(syncOptions('Yes\nYes', previous)).toEqual([
      { value: 'yes', label: 'Yes' },
      { value: 'yes-2', label: 'Yes' },
    ]);
    expect(syncOptions('Yes\nMaybe later', previous)).toEqual([
      { value: 'yes', label: 'Yes' },
      { value: 'maybe-later', label: 'Maybe later' },
    ]);
  });
});

describe('building blocks', () => {
  it('makes steps and questions with ids that fit the shared pattern', () => {
    const step = newStep(2);
    expect(step.title).toBe('Step 3');
    expect(step.id).toMatch(STABLE_ID_PATTERN);
    const choice = newField('radio');
    expect(choice.id).toMatch(STABLE_ID_PATTERN);
    expect(choice.options).toHaveLength(2);
    expect(newField('consent').required).toBe(true);
    expect(newField('short-text').options).toEqual([]);
  });

  it('duplicates a question with a new id and without its applicant mapping', () => {
    const original = { ...newField('email'), label: 'Email', mapsTo: 'applicant-email' as const };
    const copy = duplicateField(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy).toMatchObject({ label: 'Email (copy)', mapsTo: null, type: 'email' });
  });

  it('moves one item and leaves the list alone for a move off either end', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 2)).toEqual(['a', 'b']);
  });

  it('offers only comparisons that suit the question', () => {
    expect(operatorsFor('file')).toEqual(['is-empty', 'is-not-empty']);
    expect(operatorsFor('radio')).not.toContain('includes');
    expect(operatorsFor('multi-select')).toContain('includes');
  });

  it('lists only earlier questions for a condition', () => {
    const steps: FormStep[] = [
      { id: 's1', title: 'One', fields: [newField('short-text'), newField('email')] },
      { id: 's2', title: 'Two', fields: [newField('radio'), newField('number')] },
    ];
    const ids = (index: number, field: number) =>
      questionsBefore(steps, index, field).map((candidate) => candidate.type);
    expect(ids(0, 0)).toEqual([]);
    expect(ids(0, 1)).toEqual(['short-text']);
    expect(ids(1, 1)).toEqual(['short-text', 'email', 'radio']);
  });

  it('finds the problems about one question by its name', () => {
    const problems = [
      '"Colour" needs at least one option to choose from.',
      '"Name" cannot supply x.',
    ];
    expect(problemsForField(problems, { id: 'c', label: 'Colour' })).toEqual([problems[0]]);
    expect(problemsForField(problems, { id: 'z', label: '' })).toEqual([]);
  });
});
