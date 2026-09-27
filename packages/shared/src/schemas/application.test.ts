import { describe, expect, it } from 'vitest';

import {
  APPLICATION_REFERENCE_PATTERN,
  APPLICATION_STATUSES,
  applicationExportQuerySchema,
  applicationListQuerySchema,
  applicationReviewInputSchema,
  applicationStatusChangeSchema,
  canChangeApplicationStatus,
  draftCreateSchema,
  draftSaveSchema,
  draftSubmitSchema,
  resumeLinkSchema,
  REVIEWABLE_APPLICATION_STATUSES,
  uploadSignSchema,
  type ApplicationStatus,
} from './application.js';

const formId = '64b7f0c2a1b2c3d4e5f60718';

describe('application statuses', () => {
  it('keeps drafts out of the review lists', () => {
    expect(REVIEWABLE_APPLICATION_STATUSES).not.toContain('draft');
    expect([...REVIEWABLE_APPLICATION_STATUSES, 'draft'].sort()).toEqual(
      [...APPLICATION_STATUSES].sort(),
    );
  });

  it.each<[ApplicationStatus, ApplicationStatus, boolean]>([
    ['submitted', 'under-review', true],
    ['under-review', 'shortlisted', true],
    ['shortlisted', 'accepted', true],
    ['rejected', 'under-review', true],
    ['accepted', 'submitted', true],
    ['draft', 'submitted', false],
    ['submitted', 'draft', false],
    ['accepted', 'accepted', false],
  ])('%s to %s is %s for a reviewer', (from, to, allowed) => {
    expect(canChangeApplicationStatus(from, to)).toBe(allowed);
  });
});

describe('applicant inputs', () => {
  it('lets Begin come before any answer', () => {
    expect(draftCreateSchema.parse({})).toEqual({});
    expect(draftSubmitSchema.parse({})).toEqual({});
  });

  it('saves answers with the step the applicant is on', () => {
    expect(
      draftSaveSchema.parse({
        answers: [{ fieldId: 'full-name', value: 'Ama Mensah' }],
        currentStepId: 'about-you',
      }),
    ).toEqual({
      answers: [{ fieldId: 'full-name', value: 'Ama Mensah' }],
      currentStepId: 'about-you',
    });
  });

  it('refuses an autosave without answers, or answering a question twice', () => {
    expect(draftSaveSchema.safeParse({}).success).toBe(false);
    expect(
      draftSaveSchema.safeParse({
        answers: [
          { fieldId: 'a', value: 'x' },
          { fieldId: 'a', value: 'y' },
        ],
      }).success,
    ).toBe(false);
    expect(draftSaveSchema.safeParse({ answers: [], currentStepId: 'Step One' }).success).toBe(
      false,
    );
  });

  it('tidies the email for a resume link', () => {
    expect(resumeLinkSchema.parse({ email: '  Ama@Example.ORG ' })).toEqual({
      email: 'ama@example.org',
    });
    expect(resumeLinkSchema.safeParse({ email: 'not an email' }).success).toBe(false);
  });

  it('refuses an upload that is empty, nameless or over the ceiling', () => {
    expect(
      uploadSignSchema.parse({ fieldId: 'headshot', filename: ' me.jpg ', bytes: 1024 }),
    ).toEqual({ fieldId: 'headshot', filename: 'me.jpg', bytes: 1024 });
    expect(
      uploadSignSchema.safeParse({ fieldId: 'headshot', filename: 'me.jpg', bytes: 0 }).success,
    ).toBe(false);
    expect(
      uploadSignSchema.safeParse({ fieldId: 'headshot', filename: '  ', bytes: 1 }).success,
    ).toBe(false);
    expect(
      uploadSignSchema.safeParse({
        fieldId: 'headshot',
        filename: 'huge.pdf',
        bytes: 10 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
  });
});

describe('reviewer inputs', () => {
  it('moves an application with an optional note, never back to draft', () => {
    expect(applicationStatusChangeSchema.parse({ status: 'shortlisted', note: '' })).toEqual({
      status: 'shortlisted',
    });
    expect(applicationStatusChangeSchema.safeParse({ status: 'draft' }).success).toBe(false);
  });

  it('takes a review with notes and an optional score out of five', () => {
    expect(
      applicationReviewInputSchema.parse({
        notes: ' Strong session idea ',
        recommendation: 'yes',
        score: 4,
      }),
    ).toEqual({ notes: 'Strong session idea', recommendation: 'yes', score: 4 });
    expect(applicationReviewInputSchema.safeParse({ notes: '   ' }).success).toBe(false);
    expect(applicationReviewInputSchema.safeParse({ notes: 'ok', score: 6 }).success).toBe(false);
    expect(applicationReviewInputSchema.safeParse({ notes: 'ok', score: 3.5 }).success).toBe(false);
  });
});

describe('application list query', () => {
  it('sorts newest submissions first by default', () => {
    expect(
      applicationListQuerySchema.parse({ formId, from: '2026-10-01', to: '2026-10-31' }),
    ).toEqual({
      page: 1,
      pageSize: 20,
      sort: 'submitted',
      order: 'desc',
      formId,
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });

  it('never lists drafts and refuses dates that are not days', () => {
    expect(applicationListQuerySchema.safeParse({ status: 'draft' }).success).toBe(false);
    expect(applicationListQuerySchema.safeParse({ from: '1 October' }).success).toBe(false);
  });

  it('exports one form at a time', () => {
    expect(applicationExportQuerySchema.safeParse({}).success).toBe(false);
    expect(applicationExportQuerySchema.parse({ formId })).toEqual({ formId });
  });
});

describe('application references', () => {
  it('look like APP- and six capitals or digits', () => {
    expect(APPLICATION_REFERENCE_PATTERN.test('APP-7K2Q9M')).toBe(true);
    expect(APPLICATION_REFERENCE_PATTERN.test('app-7k2q9m')).toBe(false);
    expect(APPLICATION_REFERENCE_PATTERN.test('APP-7K2Q9')).toBe(false);
  });
});
