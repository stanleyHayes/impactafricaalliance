import { describe, expect, it } from 'vitest';

import { recordName } from './record-name';
import type { FieldConfig } from './types';

const PILLAR_FIELDS: FieldConfig[] = [
  {
    name: 'pillarKey',
    label: 'Pillar',
    type: 'select',
    options: [{ value: 'education', label: 'Education & Skills' }],
  },
  { name: 'alt', label: 'Alt text (optional)', type: 'text' },
];

describe('recordName', () => {
  it('uses the name of a person', () => {
    expect(recordName({ fields: [] }, { id: '1', name: ' Ama Mensah ', role: 'Director' })).toBe(
      'Ama Mensah',
    );
  });

  it('prefers the list name over the public heading', () => {
    expect(
      recordName({ fields: [] }, { id: '1', name: 'Spring appeal', title: 'Give today' }),
    ).toBe('Spring appeal');
  });

  it('uses the title or label when there is no name', () => {
    expect(recordName({ fields: [] }, { id: '1', title: 'Annual report' })).toBe('Annual report');
    expect(recordName({ fields: [] }, { id: '1', label: 'Accra office' })).toBe('Accra office');
  });

  it('shows the chosen option rather than the stored key', () => {
    expect(
      recordName({ fields: PILLAR_FIELDS }, { id: '1', pillarKey: 'education', alt: 'A class' }),
    ).toBe('Education & Skills');
  });

  it('falls back to the first text field that holds something', () => {
    expect(recordName({ fields: PILLAR_FIELDS }, { id: '1', alt: 'A class' })).toBe('A class');
  });

  it('is null when nothing identifies the record', () => {
    expect(recordName({ fields: PILLAR_FIELDS }, { id: '1', name: '   ' })).toBeNull();
  });
});
