import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
  definitionChanged,
  publicWindow,
  settingsFromInput,
  settingsToDto,
  toPublicForm,
  type StoredForm,
} from './form-mappers.js';

const now = new Date('2026-10-01T12:00:00.000Z');

const stored = (overrides: Partial<StoredForm> = {}): StoredForm => ({
  _id: new Types.ObjectId(),
  title: 'Speakers',
  slug: 'speakers',
  type: 'speaker-application',
  status: 'published',
  settings: {
    allowDrafts: true,
    notifyEmails: ['intake@iaa.org'],
    acknowledgeApplicant: true,
    successMessage: 'Thank you',
  },
  steps: [],
  version: 3,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('whether a definition changed', () => {
  const field = { id: 'name', type: 'short-text', label: 'Name', required: false, options: [] };

  it('ignores the ways storage and requests say "nothing here"', () => {
    const fromRequest = [{ id: 'a', title: 'A', fields: [{ ...field, visibility: null }] }];
    const fromStorage = [
      { id: 'a', title: 'A', description: undefined, fields: [{ ...field, validation: {} }] },
    ];
    expect(definitionChanged(fromStorage, fromRequest)).toBe(false);
  });

  it('notices a changed label, a new question or a reorder', () => {
    const before = [{ id: 'a', title: 'A', fields: [field, { ...field, id: 'email' }] }];
    expect(
      definitionChanged(before, [
        {
          id: 'a',
          title: 'A',
          fields: [
            { ...field, label: 'Your name' },
            { ...field, id: 'email' },
          ],
        },
      ]),
    ).toBe(true);
    expect(
      definitionChanged(before, [
        { id: 'a', title: 'A', fields: [{ ...field, id: 'email' }, field] },
      ]),
    ).toBe(true);
    expect(definitionChanged(undefined, { heading: 'Hello' })).toBe(true);
  });
});

describe('form settings', () => {
  it('stores the schedule as dates and leaves out what was cleared', () => {
    const record = settingsFromInput({
      allowDrafts: false,
      opensAt: '2026-10-01T09:00:00.000Z',
      closesAt: null,
      submissionLimit: null,
      notifyEmails: [],
    });
    expect(record).toEqual({ allowDrafts: false, opensAt: new Date('2026-10-01T09:00:00.000Z') });
    expect(settingsToDto(record)).toEqual({
      allowDrafts: false,
      opensAt: '2026-10-01T09:00:00.000Z',
      closesAt: null,
      submissionLimit: null,
      notifyEmails: [],
      acknowledgeApplicant: false,
    });
  });
});

describe('the public form', () => {
  it('shows nothing about who is notified, and falls back to the title for the cover', () => {
    const form = toPublicForm(stored(), now);
    expect(form.settings).toEqual({
      allowDrafts: true,
      successMessage: 'Thank you',
      opensAt: null,
      closesAt: null,
    });
    expect(form.intro).toEqual({ heading: 'Speakers' });
    expect(form).not.toHaveProperty('id');
    expect(form.version).toBe(3);
  });

  it('is closed when closed, whatever the dates say', () => {
    expect(publicWindow(stored({ status: 'closed' }), now)).toBe('closed');
    expect(publicWindow(stored(), now)).toBe('open');
    expect(
      publicWindow(
        stored({ settings: { allowDrafts: true, opensAt: new Date('2026-10-02') } }),
        now,
      ),
    ).toBe('not-yet-open');
  });
});
