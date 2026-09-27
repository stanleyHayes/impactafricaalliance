import type { Permission } from '@iaa/shared';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';

import { answerPeople, clearClients, kofi, projectFixture, renderAt } from './project-test-helpers';
import ProjectDetailLayout from './ProjectDetailLayout';
import ProjectImpactTab from './ProjectImpactTab';
import ProjectMediaTab from './ProjectMediaTab';
import ProjectMilestonesTab from './ProjectMilestonesTab';
import ProjectOverviewTab from './ProjectOverviewTab';

const permissions: { current: Permission[] } = { current: [] };

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'editor', permissions: permissions.current } }),
}));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
// The stories list belongs to the impact stories module; its own tests cover it.
vi.mock('../../components/impact-stories/ProjectStoriesPanel', () => ({
  ProjectStoriesPanel: ({ projectId }: { projectId: string }) => <p>Stories for {projectId}</p>,
}));

const get = vi.mocked(api.get);
const patch = vi.mocked(api.patch);
const project = projectFixture();

const setup = (tab: string): void => {
  renderAt(
    `/projects/${project.id}${tab ? `/${tab}` : ''}`,
    <Routes>
      <Route path="/projects/:projectId" element={<ProjectDetailLayout />}>
        <Route index element={<ProjectOverviewTab />} />
        <Route path="milestones" element={<ProjectMilestonesTab />} />
        <Route path="media" element={<ProjectMediaTab />} />
        <Route path="impact" element={<ProjectImpactTab />} />
      </Route>
    </Routes>,
  );
};

const serve = (overrides: Parameters<typeof projectFixture>[0] = {}): void => {
  get.mockImplementation((path: string) =>
    Promise.resolve(answerPeople(path) ?? projectFixture(overrides)),
  );
};

beforeEach(() => {
  permissions.current = ['projects:read', 'projects:update'];
  serve();
  patch.mockImplementation((_path: string, body: unknown) =>
    Promise.resolve({ ...projectFixture(), ...(body as object) }),
  );
});

afterEach(() => {
  cleanup();
  clearClients();
  vi.clearAllMocks();
});

describe('project tabs', () => {
  it('shows the overview: description, objectives, partners, goals and people', async () => {
    setup('');
    expect(await screen.findByText('Train 300 young people')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tamale Tech/ })).toHaveAttribute(
      'href',
      'https://tamaletech.example',
    );
    expect(screen.getByText('Goal 4: Quality Education')).toBeInTheDocument();
    expect(screen.getByText(kofi.name)).toBeInTheDocument();
  });

  it('ticks a milestone off by saving the whole list', async () => {
    setup('milestones');
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Mark done: First cohort' }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    const body = patch.mock.calls[0]?.[1] as { milestones: { id: string; status: string }[] };
    expect(body.milestones.map((item) => [item.id, item.status])).toEqual([
      ['launch', 'done'],
      ['cohort', 'done'],
    ]);
    expect(body.milestones.every((item) => !('completedAt' in item))).toBe(true);
  });

  it('marks a hand-set figure and offers to go back to counting', async () => {
    serve({
      progressOverride: { value: 75, reason: 'Training ended early' },
      progress: { value: 75, source: 'manual', done: 5, total: 12, reason: 'Training ended early' },
    });
    setup('milestones');
    expect(await screen.findByText(/set by hand and is not a count/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go back to counting work' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`/admin/projects/${project.id}`, {
        progressOverride: null,
      }),
    );
  });

  it('is read-only without permission to update, and says who can change that', async () => {
    permissions.current = ['projects:read'];
    setup('milestones');
    expect(await screen.findByText(/an administrator can grant under Users/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Mark done: First cohort' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set progress by hand' })).not.toBeInTheDocument();
  });

  it('shows whether each photo is cleared for public use, and edits consent in a dialog', async () => {
    serve({
      media: [
        {
          id: 'photo-1',
          image: { url: 'https://res.cloudinary.com/demo/a.jpg', publicId: 'a' },
          caption: 'Opening day',
          takenOn: null,
          shareable: false,
          addedBy: kofi,
          addedAt: '2026-10-05T10:00:00.000Z',
        },
      ],
    });
    setup('media');
    expect(await screen.findByText('Internal only')).toBeInTheDocument();
    expect(
      screen.getByText(/Only photos cleared for public use can go into an impact story/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Opening day' }));
    const dialog = await screen.findByRole('dialog', { name: 'Photo details' });
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Cleared for public use' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`/admin/projects/${project.id}/media/photo-1`, {
        caption: 'Opening day',
        takenOn: null,
        shareable: true,
      }),
    );
  });

  it('describes an uncaptioned photo instead of hiding it from screen readers', async () => {
    serve({
      media: [
        {
          id: 'photo-2',
          image: { url: 'https://res.cloudinary.com/demo/b.jpg', publicId: 'b' },
          takenOn: null,
          shareable: true,
          addedBy: kofi,
          addedAt: '2026-10-05T10:00:00.000Z',
        },
      ],
    });
    setup('media');
    expect(
      await screen.findByRole('img', { name: 'Photo added 5 Oct 2026, no caption' }),
    ).toBeInTheDocument();
  });

  it('adds an impact number with a target, then shows the stories panel', async () => {
    setup('impact');
    expect(await screen.findByText(`Stories for ${project.id}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add a risk' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add a number' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add an impact number' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /What is counted/ }), {
      target: { value: 'People trained' },
    });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /So far/ }), {
      target: { value: '120' },
    });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Target/ }), {
      target: { value: '300' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0]?.[1]).toEqual({
      metrics: [expect.objectContaining({ label: 'People trained', value: 120, target: 300 })],
    });
  });
});
