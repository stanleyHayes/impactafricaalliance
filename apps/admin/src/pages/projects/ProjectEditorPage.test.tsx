import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError } from '../../lib/api-client';
import { goToStep } from '../../test/step-menu';

import {
  answerPeople,
  clearClients,
  latestClient,
  projectFixture,
  renderAt,
} from './project-test-helpers';
import ProjectEditorPage from './ProjectEditorPage';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'editor', permissions: ['projects:read', 'projects:update'] } }),
}));
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const patch = vi.mocked(api.patch);

const setup = (path: string): void => {
  renderAt(
    path,
    <Routes>
      <Route path="/projects/new" element={<ProjectEditorPage />} />
      <Route path="/projects/:projectId/edit" element={<ProjectEditorPage />} />
      <Route path="/projects/:projectId" element={<p>Project page</p>} />
    </Routes>,
  );
};

const heading = (name: string) => screen.findByRole('heading', { level: 2, name });
const form = () => screen.getByRole('form');
const type = (label: RegExp, value: string): void => {
  fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } });
};
const next = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  get.mockImplementation((path: string) => {
    const people = answerPeople(path);
    if (people) return Promise.resolve(people);
    return Promise.resolve(projectFixture());
  });
});

afterEach(() => {
  cleanup();
  clearClients();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('ProjectEditorPage', () => {
  it('keeps you on a step until it is valid, and Enter moves on with the same checks', async () => {
    setup('/projects/new');
    expect(await heading('Basics')).toBeInTheDocument();
    next();
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the highlighted fields');
    expect(screen.getByRole('heading', { level: 2, name: 'Basics' })).toBeInTheDocument();
    expect(screen.getByText(/Give the project a title/)).toBeInTheDocument();

    type(/^Title/, 'Digital Skills Hub');
    // The slug follows the title until someone edits it.
    expect(screen.getByRole('textbox', { name: /^Slug/ })).toHaveValue('digital-skills-hub');
    // Enter in a field submits the form; on an intermediate step that means Continue.
    fireEvent.submit(form());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Basics' })).toBeInTheDocument();

    type(/^Summary/, 'Coding and e-commerce training for young people.');
    fireEvent.submit(form());
    expect(await heading('People')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('creates the project only from the Review step', async () => {
    post.mockResolvedValue(projectFixture({ id: 'd'.repeat(24) }));
    setup('/projects/new');
    await heading('Basics');
    type(/^Title/, 'Digital Skills Hub');
    type(/^Summary/, 'Coding and e-commerce training for young people.');
    next();
    await heading('People');
    next();
    await heading('Schedule & place');
    type(/^Country/, 'Ghana');
    next();
    await heading('Scope');
    fireEvent.click(screen.getByRole('button', { name: 'Add an objective' }));
    type(/^Objective 1/, 'Train 300 young people');
    fireEvent.click(screen.getByRole('checkbox', { name: /Goal 4: Quality Education/ }));
    next();
    await heading('Story & cover');
    next();
    expect(await heading('Review')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    const scope = screen.getByRole('region', { name: 'Scope' });
    expect(within(scope).getByText('Train 300 young people')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]?.[0]).toBe('/admin/projects');
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      title: 'Digital Skills Hub',
      slug: 'digital-skills-hub',
      status: 'draft',
      country: 'Ghana',
      objectives: ['Train 300 young people'],
      sdgs: [4],
    });
    expect(await screen.findByText('Project page')).toBeInTheDocument();
  });

  it('keeps the form and returns to the step when the save is refused', async () => {
    post.mockRejectedValue(
      new ApiError(
        409,
        'CONFLICT',
        'Another project already uses the address "digital-skills-hub". Choose a different one.',
      ),
    );
    setup('/projects/new');
    await heading('Basics');
    type(/^Title/, 'Digital Skills Hub');
    type(/^Summary/, 'Coding and e-commerce training for young people.');
    for (const step of ['People', 'Schedule & place', 'Scope', 'Story & cover', 'Review']) {
      next();
      await heading(step);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await heading('Basics')).toBeInTheDocument();
    expect(screen.getAllByText(/already uses the address/).length).toBeGreaterThan(0);
    expect(screen.getByRole('textbox', { name: /^Title/ })).toHaveValue('Digital Skills Hub');
    expect(screen.getByRole('textbox', { name: /^Slug/ })).toHaveAttribute('aria-invalid', 'true');
  });

  it('loads a saved project into the same steps and sends null for what was cleared', async () => {
    patch.mockResolvedValue(projectFixture());
    setup(`/projects/${projectFixture().id}/edit`);
    expect(await screen.findByRole('textbox', { name: /^Title/ })).toHaveValue(
      'Digital Skills Hub, Tamale',
    );
    expect(screen.getByRole('textbox', { name: /^Slug/ })).toHaveValue('digital-skills-hub-tamale');
    // Editing the title of a saved project never moves its slug.
    type(/^Title/, 'Digital Skills Hub, Tamale and Yendi');
    expect(screen.getByRole('textbox', { name: /^Slug/ })).toHaveValue('digital-skills-hub-tamale');
    next();
    await heading('People');
    next();
    await heading('Schedule & place');
    expect(screen.getByRole('textbox', { name: /^Country/ })).toHaveValue('Ghana');
    type(/^Country/, '');
    next();
    await heading('Scope');
    next();
    await heading('Story & cover');
    type(/^Reference code/, '');
    next();
    await heading('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Update project' }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0]?.[0]).toBe(`/admin/projects/${projectFixture().id}`);
    const body = patch.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).toMatchObject({
      title: 'Digital Skills Hub, Tamale and Yendi',
      country: null,
      code: null,
      region: 'Northern Region',
      leadId: projectFixture().leadId,
    });
    // The status was not touched, so a move a colleague made meanwhile stands.
    expect(body).not.toHaveProperty('status');
    // The plans are edited on their own tabs; the editor never overwrites them.
    expect(body).not.toHaveProperty('milestones');
    expect(body).not.toHaveProperty('progressOverride');
  });

  it('will not move on from, or save, an end date that is only half typed', async () => {
    setup(`/projects/${projectFixture().id}/edit`);
    await screen.findByRole('textbox', { name: /^Title/ });
    next();
    await heading('People');
    next();
    await heading('Schedule & place');
    const end = screen.getByRole('group', { name: /End date/ });
    const day = within(end).getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    fireEvent.keyDown(day, { key: 'Delete' });
    await screen.findByText('Finish typing the date, or clear the field.');

    // Enter, Continue and a jump to Review from the step rail all stay put.
    fireEvent.submit(form());
    expect(
      await screen.findByText('Finish typing the date, or clear it, before continuing.'),
    ).toBeInTheDocument();
    next();
    await goToStep(5);
    expect(screen.getByRole('heading', { level: 2, name: 'Schedule & place' })).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  it('reviews with the shared summary, with an Edit button per section', async () => {
    setup(`/projects/${projectFixture().id}/edit`);
    await screen.findByRole('textbox', { name: /^Title/ });
    await goToStep(5);
    await heading('Review');
    expect(screen.getByRole('region', { name: 'Schedule & place' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit scope' }));
    expect(await heading('Scope')).toBeInTheDocument();
  });

  it('keeps what you typed when the project is refreshed behind the form', async () => {
    patch.mockResolvedValue(projectFixture());
    setup(`/projects/${projectFixture().id}/edit`);
    await screen.findByRole('textbox', { name: /^Title/ });
    type(/^Title/, 'Digital Skills Hub, Yendi');

    // A refresh that fails (the API asleep) must not swap the form for an error.
    get.mockImplementation((path: string) =>
      path.startsWith('/admin/projects')
        ? Promise.reject(new ApiError(503, 'UNAVAILABLE', 'The server is waking up.'))
        : Promise.resolve(answerPeople(path)),
    );
    await latestClient().refetchQueries({ queryKey: ['projects'] });
    await waitFor(() =>
      expect(
        latestClient().getQueryState(['projects', 'detail', projectFixture().id])?.status,
      ).toBe('error'),
    );
    // Give the page time to react to the failed refresh before checking it kept the form.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText('The server is waking up.')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Title/ })).toHaveValue(
      'Digital Skills Hub, Yendi',
    );

    // A refresh that shows a colleague archived it meanwhile does not make
    // this save send the old status back.
    get.mockImplementation((path: string) =>
      Promise.resolve(answerPeople(path) ?? projectFixture({ status: 'archived' })),
    );
    await latestClient().refetchQueries({ queryKey: ['projects'] });
    for (const step of ['People', 'Schedule & place', 'Scope', 'Story & cover', 'Review']) {
      next();
      await heading(step);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Update project' }));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch.mock.calls[0]?.[1]).not.toHaveProperty('status');
    expect(patch.mock.calls[0]?.[1]).toMatchObject({ title: 'Digital Skills Hub, Yendi' });
  });

  it('shows a skeleton while loading and says so when the project is missing', async () => {
    get.mockImplementation((path: string) =>
      path.startsWith('/admin/projects')
        ? Promise.reject(new ApiError(404, 'NOT_FOUND', 'Project not found'))
        : Promise.resolve(answerPeople(path)),
    );
    setup(`/projects/${projectFixture().id}/edit`);
    expect(screen.getByRole('heading', { level: 1, name: 'Edit project' })).toBeInTheDocument();
    expect(await screen.findByText(/could not be found/)).toBeInTheDocument();
  });
});
