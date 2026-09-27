import {
  APPLICANT_MAPPINGS,
  APPLICATION_RECOMMENDATIONS,
  DUE_BUCKETS,
  FILE_KINDS,
  FORM_FIELD_TYPES,
  FORM_STATUSES,
  FORM_TYPES,
  IMPACT_STORY_STATUSES,
  MILESTONE_KINDS,
  MILESTONE_STATUSES,
  PILLARS,
  PROJECT_STATUSES,
  REVIEWABLE_APPLICATION_STATUSES,
  RISK_LEVELS,
  RISK_STATUSES,
  STORY_BLOCK_TYPES,
  TASK_BOARD_COLUMNS,
  VISIBILITY_OPERATORS,
  WORK_PRIORITIES,
} from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import type { SelectChoice } from '../components/fields/OptionSelect';

import {
  APPLICANT_MAPPING_OPTIONS,
  APPLICATION_RECOMMENDATION_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
  DUE_BUCKET_OPTIONS,
  FILE_KIND_OPTIONS,
  FORM_FIELD_TYPE_OPTIONS,
  FORM_STATUS_OPTIONS,
  FORM_TYPE_OPTIONS,
  IMPACT_STORY_STATUS_OPTIONS,
  MILESTONE_KIND_OPTIONS,
  MILESTONE_STATUS_OPTIONS,
  PROGRAMME_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  RISK_LEVEL_OPTIONS,
  RISK_STATUS_OPTIONS,
  STORY_BLOCK_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
  VISIBILITY_OPERATOR_OPTIONS,
  WORK_PRIORITY_OPTIONS,
} from './select-options';

// Each menu against the values the API accepts, in the order the menu shows
// them. A value added to a shared list without wording here would otherwise
// appear in the dashboard as a bare database word, or not at all.
const catalogues: [string, SelectChoice[], readonly string[]][] = [
  ['project statuses', PROJECT_STATUS_OPTIONS, PROJECT_STATUSES],
  ['priorities', WORK_PRIORITY_OPTIONS, WORK_PRIORITIES],
  ['milestone statuses', MILESTONE_STATUS_OPTIONS, MILESTONE_STATUSES],
  ['milestone kinds', MILESTONE_KIND_OPTIONS, MILESTONE_KINDS],
  ['risk levels', RISK_LEVEL_OPTIONS, RISK_LEVELS],
  ['risk statuses', RISK_STATUS_OPTIONS, RISK_STATUSES],
  ['programmes', PROGRAMME_OPTIONS, PILLARS.map((pillar) => pillar.key)],
  ['task statuses', TASK_STATUS_OPTIONS, TASK_BOARD_COLUMNS],
  ['due buckets', DUE_BUCKET_OPTIONS, DUE_BUCKETS],
  ['form types', FORM_TYPE_OPTIONS, FORM_TYPES],
  ['form statuses', FORM_STATUS_OPTIONS, FORM_STATUSES],
  ['question types', FORM_FIELD_TYPE_OPTIONS, FORM_FIELD_TYPES],
  ['file kinds', FILE_KIND_OPTIONS, FILE_KINDS],
  ['visibility operators', VISIBILITY_OPERATOR_OPTIONS, VISIBILITY_OPERATORS],
  ['applicant mappings', APPLICANT_MAPPING_OPTIONS, APPLICANT_MAPPINGS],
  ['application statuses', APPLICATION_STATUS_OPTIONS, REVIEWABLE_APPLICATION_STATUSES],
  ['recommendations', APPLICATION_RECOMMENDATION_OPTIONS, APPLICATION_RECOMMENDATIONS],
  ['impact story statuses', IMPACT_STORY_STATUS_OPTIONS, IMPACT_STORY_STATUSES],
  ['story block types', STORY_BLOCK_TYPE_OPTIONS, STORY_BLOCK_TYPES],
];

describe('work module option catalogues', () => {
  it.each(catalogues)('offers every one of the %s, and nothing else', (_name, options, values) => {
    expect(options.map((option) => option.value)).toEqual([...values]);
  });

  it.each(catalogues)('describes and illustrates each of the %s', (_name, options) => {
    for (const option of options) {
      expect(option.label).not.toBe('');
      expect(option.description?.length ?? 0).toBeGreaterThan(5);
      expect(option.icon).toBeTruthy();
    }
  });

  it('names the file formats each kind accepts', () => {
    expect(
      FILE_KIND_OPTIONS.find((option) => option.value === 'spreadsheet')?.description,
    ).toContain('XLSX');
  });
});
