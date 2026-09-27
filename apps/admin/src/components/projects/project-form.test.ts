import { describe, expect, it } from 'vitest';

import { ApiError } from '../../lib/api-client';

import { saveMetric, towardsTarget, parseMetricDraft } from './impact-items';
import {
  editorStatuses,
  emptyProjectForm,
  firstInvalidStep,
  parseProjectForm,
  projectEditBody,
  serverProblem,
  stepErrors,
  withTitle,
  type ProjectFormState,
} from './project-form';
import { formatDateRange, formatDay, progressText } from './project-format';

const filled = (overrides: Partial<ProjectFormState> = {}): ProjectFormState => ({
  ...withTitle(emptyProjectForm(), 'Digital Skills Hub'),
  summary: 'Coding and e-commerce training for young people.',
  ...overrides,
});

describe('project form', () => {
  it('carries the slug along with the title until someone edits it', () => {
    const form = withTitle(emptyProjectForm(), 'Côte d’Ivoire outreach');
    expect(form.slug).toBe('cote-divoire-outreach');
    const chosen = withTitle({ ...form, slug: 'civ-2026', slugTouched: true }, 'Renamed');
    expect(chosen.slug).toBe('civ-2026');
  });

  it('checks only the fields on the step being left', () => {
    const form = filled({
      title: '',
      endDate: '2026-01-01T12:00:00.000Z',
      startDate: '2026-02-01T12:00:00.000Z',
    });
    // The slug was filled in from the title before it was cleared, so only the title is missing.
    expect(Object.keys(stepErrors(form, 0))).toEqual(['title']);
    expect(stepErrors(form, 2)).toEqual({ endDate: 'The end date is before the start date.' });
    expect(stepErrors(form, 1)).toEqual({});
    expect(firstInvalidStep(form)).toBe(0);
    expect(firstInvalidStep(filled())).toBeNull();
  });

  it('drops blank lines and rows, but not a partner with a link and no name', () => {
    const form = filled({
      objectives: ['  ', 'Train 300 young people'],
      partners: [
        { name: '', role: '', url: '' },
        { name: '', role: '', url: 'https://tamaletech.example' },
      ],
    });
    expect(stepErrors(form, 3)).toEqual({
      'partners.0.name': 'Name the partner, or remove the row.',
    });
    const fixed = parseProjectForm({ ...form, partners: [] });
    expect(fixed.success && fixed.data.objectives).toEqual(['Train 300 young people']);
  });

  it('sends null for every emptied optional field on edit', () => {
    const parsed = parseProjectForm(filled());
    if (!parsed.success) throw new Error('fixture should parse');
    const body = projectEditBody(parsed.data, 'draft');
    expect(body).toMatchObject({
      leadId: null,
      programme: null,
      startDate: null,
      endDate: null,
      country: null,
      region: null,
      locationText: null,
      cover: null,
      code: null,
    });
    expect(body).not.toHaveProperty('milestones');
    expect(body).not.toHaveProperty('metrics');
  });

  it('sends the status only when this edit changed it', () => {
    const parsed = parseProjectForm(filled({ status: 'active' }));
    if (!parsed.success) throw new Error('fixture should parse');
    // Unchanged: a colleague who archived the project meanwhile is not overruled.
    expect(projectEditBody(parsed.data, 'active')).not.toHaveProperty('status');
    expect(projectEditBody(parsed.data, 'planned')).toMatchObject({ status: 'active' });
  });

  it('offers only the moves the lifecycle allows, and not archiving', () => {
    expect(editorStatuses(null)).toEqual(['draft', 'planned', 'active', 'on-hold', 'completed']);
    expect(editorStatuses('planned')).toEqual(['planned', 'draft', 'active', 'on-hold']);
    expect(editorStatuses('archived')).toEqual([
      'archived',
      'draft',
      'planned',
      'active',
      'on-hold',
      'completed',
    ]);
  });

  it('sends a refused save back to the step it belongs to', () => {
    expect(
      serverProblem(
        new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', [
          { path: 'endDate', message: 'The end date is before the start date.' },
        ]),
      ),
    ).toEqual({ step: 2, errors: { endDate: 'The end date is before the start date.' } });
    expect(
      serverProblem(new ApiError(409, 'CONFLICT', 'Another project already uses the address "x".'))
        ?.step,
    ).toBe(0);
    expect(
      serverProblem(
        new ApiError(
          400,
          'VALIDATION_ERROR',
          'The project lead must be active members of the team',
        ),
      ),
    ).toMatchObject({ step: 1 });
    expect(serverProblem(new Error('offline'))).toBeNull();
    // A server fault is never pinned on a field, whatever words it happens to use.
    expect(
      serverProblem(new ApiError(500, 'INTERNAL', 'Could not reach the members list')),
    ).toBeNull();
  });
});

describe('project wording', () => {
  it('says what progress is made of', () => {
    expect(progressText({ value: 42, source: 'tasks-and-milestones', done: 5, total: 12 })).toBe(
      '42% · 5 of 12 done',
    );
    expect(
      progressText({ value: 80, source: 'manual', done: 5, total: 12, reason: 'Ended early' }),
    ).toBe('80% · Set by hand: Ended early');
    expect(progressText({ value: null, source: 'none', done: 0, total: 0 })).toBe(
      'Nothing to measure yet',
    );
  });

  it('reads calendar dates as days', () => {
    expect(formatDay('2026-10-05T12:00:00.000Z')).toBe('5 Oct 2026');
    expect(formatDateRange('2026-10-05T12:00:00.000Z', null)).toBe('From 5 Oct 2026');
    expect(formatDateRange(null, null)).toBe('No dates yet');
  });
});

describe('impact numbers', () => {
  it('measures against a target only when there is one', () => {
    expect(towardsTarget({ value: 150, target: 300 })).toBe(50);
    expect(towardsTarget({ value: 450, target: 300 })).toBe(100);
    expect(towardsTarget({ value: 5, target: null })).toBeNull();
  });

  it('parses what was typed and adds it with a fresh id', () => {
    const parsed = parseMetricDraft({
      label: 'People trained',
      value: '120',
      target: '',
      suffix: '+',
    });
    expect(parsed).toEqual({
      ok: true,
      metric: { label: 'People trained', value: 120, target: null, suffix: '+' },
    });
    if (!parsed.ok) return;
    const next = saveMetric([], parsed.metric, null);
    expect(next[0]?.id).toMatch(/^metric-/);
    expect(parseMetricDraft({ label: '', value: '-2', target: 'x', suffix: '' }).ok).toBe(false);
  });
});
