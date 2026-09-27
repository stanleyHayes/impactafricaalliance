import { describe, expect, it } from 'vitest';

import { PILLARS } from '../constants/content.js';

import {
  canTransitionProject,
  computeProjectProgress,
  PROGRAMME_KEYS,
  PROJECT_STATUSES,
  projectDateProblem,
  projectInputSchema,
  projectListQuerySchema,
  projectMediaInputSchema,
  projectMediaUpdateSchema,
  projectUpdateSchema,
  type ProjectStatus,
} from './project.js';

const leadId = '64b7f0c2a1b2c3d4e5f60718';

const validProject = {
  title: 'Digital Skills Hub, Tamale',
  slug: 'digital-skills-hub-tamale',
  summary: 'Coding and e-commerce training for young people in the Northern Region.',
};

describe('project progress', () => {
  it('counts finished tasks and milestones together', () => {
    expect(
      computeProjectProgress({
        tasksTotal: 3,
        tasksDone: 1,
        milestones: [{ status: 'done' }],
      }),
    ).toEqual({ value: 50, source: 'tasks-and-milestones', done: 2, total: 4 });
  });

  it('rounds to a whole percentage', () => {
    expect(computeProjectProgress({ tasksTotal: 3, tasksDone: 1, milestones: [] }).value).toBe(33);
  });

  it('prefers a figure set by hand, keeping the counted figures beside it', () => {
    expect(
      computeProjectProgress({
        tasksTotal: 4,
        tasksDone: 1,
        milestones: [{ status: 'planned' }],
        override: { value: 80, reason: 'Training finished; reports not yet filed' },
      }),
    ).toEqual({
      value: 80,
      source: 'manual',
      done: 1,
      total: 5,
      reason: 'Training finished; reports not yet filed',
    });
  });

  it('says nothing rather than 0% when there is nothing to count', () => {
    expect(computeProjectProgress({ tasksTotal: 0, tasksDone: 0, milestones: [] })).toEqual({
      value: null,
      source: 'none',
      done: 0,
      total: 0,
    });
  });

  it('never reports more done than exists', () => {
    expect(computeProjectProgress({ tasksTotal: 2, tasksDone: 5, milestones: [] }).value).toBe(100);
  });
});

describe('project status changes', () => {
  it.each<[ProjectStatus, ProjectStatus, boolean]>([
    ['draft', 'active', true],
    ['draft', 'completed', false],
    ['planned', 'completed', false],
    ['active', 'draft', false],
    ['active', 'completed', true],
    ['on-hold', 'active', true],
    ['completed', 'active', true],
    ['completed', 'on-hold', false],
    ['archived', 'active', true],
  ])('%s to %s is %s', (from, to, allowed) => {
    expect(canTransitionProject(from, to)).toBe(allowed);
  });

  it('lets any status be archived, and archived come back to any working status', () => {
    for (const status of PROJECT_STATUSES) {
      expect(canTransitionProject(status, 'archived')).toBe(true);
      expect(canTransitionProject('archived', status)).toBe(true);
    }
  });

  it('always allows staying put', () => {
    for (const status of PROJECT_STATUSES) {
      expect(canTransitionProject(status, status)).toBe(true);
    }
  });
});

describe('project create schema', () => {
  it('fills in the defaults a new project starts with', () => {
    expect(projectInputSchema.parse(validProject)).toEqual({
      ...validProject,
      description: '',
      status: 'draft',
      priority: 'medium',
      memberIds: [],
      objectives: [],
      partners: [],
      tags: [],
      sdgs: [],
      milestones: [],
      metrics: [],
      risks: [],
    });
  });

  it('only accepts a programme the public site knows', () => {
    expect(PROGRAMME_KEYS).toEqual(PILLARS.map((pillar) => pillar.key));
    expect(
      projectInputSchema.safeParse({ ...validProject, programme: 'stem-learning' }).success,
    ).toBe(true);
    expect(projectInputSchema.safeParse({ ...validProject, programme: 'football' }).success).toBe(
      false,
    );
  });

  it('refuses two milestones with the same id', () => {
    const milestone = { id: 'kick-off', title: 'Kick-off' };
    expect(
      projectInputSchema.safeParse({ ...validProject, milestones: [milestone, milestone] }).success,
    ).toBe(false);
  });

  it('keeps partner links to https, and treats an empty one as none', () => {
    const parsed = projectInputSchema.parse({
      ...validProject,
      partners: [{ name: 'Tamale Tech Hub', url: '' }],
    });
    expect(parsed.partners).toEqual([{ name: 'Tamale Tech Hub' }]);
    expect(
      projectInputSchema.safeParse({
        ...validProject,
        partners: [{ name: 'Tamale Tech Hub', url: 'javascript:alert(1)' }],
      }).success,
    ).toBe(false);
  });

  // Partner links are copied into public impact stories, so the project has to
  // refuse whatever the story would refuse.
  it('refuses a partner link that hides its real host behind a user name', () => {
    expect(
      projectInputSchema.safeParse({
        ...validProject,
        partners: [{ name: 'Tamale Tech Hub', url: 'https://tamaletech.example@evil.example' }],
      }).success,
    ).toBe(false);
  });

  it('only stores https images as the cover or as evidence', () => {
    const unsafe = { url: 'javascript:alert(1)', publicId: 'iaa/x' };
    expect(projectInputSchema.safeParse({ ...validProject, cover: unsafe }).success).toBe(false);
    expect(projectMediaInputSchema.safeParse({ image: unsafe }).success).toBe(false);
  });

  it('only takes real SDG numbers', () => {
    expect(projectInputSchema.safeParse({ ...validProject, sdgs: [4, 5, 17] }).success).toBe(true);
    expect(projectInputSchema.safeParse({ ...validProject, sdgs: [18] }).success).toBe(false);
  });
});

describe('project patch contract', () => {
  it('does not inject create defaults into a partial edit', () => {
    expect(projectUpdateSchema.parse({ title: 'Renamed project' })).toEqual({
      title: 'Renamed project',
    });
  });

  it('clears optional fields with null and leaves absent ones alone', () => {
    expect(
      projectUpdateSchema.parse({
        leadId: null,
        programme: null,
        startDate: null,
        endDate: '',
        cover: null,
        progressOverride: null,
        code: null,
        country: '',
      }),
    ).toEqual({
      leadId: null,
      programme: null,
      startDate: null,
      endDate: null,
      cover: null,
      progressOverride: null,
      code: null,
      country: null,
    });
  });

  it('refuses to clear a required field', () => {
    expect(projectUpdateSchema.safeParse({ title: null }).success).toBe(false);
    expect(projectUpdateSchema.safeParse({ summary: null }).success).toBe(false);
  });

  it('replaces a list whole when one is sent', () => {
    expect(projectUpdateSchema.parse({ leadId, memberIds: [leadId] })).toEqual({
      leadId,
      memberIds: [leadId],
    });
  });
});

describe('project photos', () => {
  it('edits details without swapping the picture', () => {
    expect(projectMediaUpdateSchema.parse({})).toEqual({});
    expect(
      projectMediaUpdateSchema.parse({
        caption: null,
        shareable: true,
        image: { url: 'https://example.org/a.jpg', publicId: 'a' },
      }),
    ).toEqual({ caption: null, shareable: true });
  });
});

describe('project dates', () => {
  it('objects to an end before the start', () => {
    expect(projectDateProblem('2026-10-05T12:00:00.000Z', '2026-10-04T12:00:00.000Z')).toBe(
      'The end date is before the start date.',
    );
  });

  it('accepts a one-day project and missing dates', () => {
    expect(projectDateProblem('2026-10-05T12:00:00.000Z', '2026-10-05T12:00:00.000Z')).toBeNull();
    expect(projectDateProblem(null, '2026-10-05T12:00:00.000Z')).toBeNull();
    expect(projectDateProblem()).toBeNull();
  });
});

describe('project list query', () => {
  it('sorts by last update and reads flags as booleans', () => {
    expect(projectListQuerySchema.parse({ mine: 'false', includeArchived: 'true' })).toEqual({
      page: 1,
      pageSize: 20,
      sort: 'updated',
      mine: false,
      includeArchived: true,
    });
  });

  it('refuses an unknown status or sort', () => {
    expect(projectListQuerySchema.safeParse({ status: 'paused' }).success).toBe(false);
    expect(projectListQuerySchema.safeParse({ sort: 'random' }).success).toBe(false);
  });
});
