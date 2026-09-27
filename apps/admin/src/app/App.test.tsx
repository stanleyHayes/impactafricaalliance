import { cleanup, render, screen } from '@testing-library/react';
import type * as Router from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

// The routes are what is under test, not the pages: each work-module page is
// replaced by its own name, so this keeps passing as the modules replace
// their placeholders.
const { auth, named } = vi.hoisted(() => ({
  auth: { user: { role: 'editor', permissions: [] as string[] }, status: 'authenticated' },
  named: (name: string) => ({ default: () => name }),
}));

vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../components/layout/AppShell', async () => {
  const { Outlet } = await vi.importActual<typeof Router>('react-router-dom');
  return { AppShell: () => <Outlet /> };
});
vi.mock('../pages/projects/ProjectsPage', () => named('ProjectsPage'));
vi.mock('../pages/projects/ProjectEditorPage', () => named('ProjectEditorPage'));
vi.mock('../pages/projects/ProjectDetailLayout', async () => {
  const { Outlet } = await vi.importActual<typeof Router>('react-router-dom');
  return {
    default: () => (
      <>
        ProjectDetailLayout / <Outlet />
      </>
    ),
  };
});
vi.mock('../pages/projects/ProjectOverviewTab', () => named('ProjectOverviewTab'));
vi.mock('../pages/projects/ProjectTasksTab', () => named('ProjectTasksTab'));
vi.mock('../pages/projects/ProjectMilestonesTab', () => named('ProjectMilestonesTab'));
vi.mock('../pages/projects/ProjectMediaTab', () => named('ProjectMediaTab'));
vi.mock('../pages/projects/ProjectImpactTab', () => named('ProjectImpactTab'));
vi.mock('../pages/projects/ProjectDocumentsTab', () => named('ProjectDocumentsTab'));
vi.mock('../pages/projects/ProjectActivityTab', () => named('ProjectActivityTab'));
vi.mock('../pages/tasks/MyTasksPage', () => named('MyTasksPage'));
vi.mock('../pages/tasks/AllTasksPage', () => named('AllTasksPage'));
vi.mock('../pages/tasks/TaskBoardPage', () => named('TaskBoardPage'));
vi.mock('../pages/tasks/TaskEditorPage', () => named('TaskEditorPage'));
vi.mock('../pages/tasks/TaskDetailPage', () => named('TaskDetailPage'));
vi.mock('../pages/forms/FormsPage', () => named('FormsPage'));
vi.mock('../pages/forms/FormEditorPage', () => named('FormEditorPage'));
vi.mock('../pages/forms/FormDetailPage', () => named('FormDetailPage'));
vi.mock('../pages/applications/ApplicationsPage', () => named('ApplicationsPage'));
vi.mock('../pages/applications/ReviewQueuePage', () => named('ReviewQueuePage'));
vi.mock('../pages/applications/ApplicationDetailPage', () => named('ApplicationDetailPage'));
vi.mock('../pages/impact-stories/ImpactStoriesPage', () => ({
  default: ({ view }: { view?: string }) => `ImpactStoriesPage:${view}`,
}));
vi.mock('../pages/impact-stories/ImpactStoryEditorPage', () => named('ImpactStoryEditorPage'));
vi.mock('../pages/impact-stories/StoryFromProjectPage', () => named('StoryFromProjectPage'));

const ALL_WORK_PERMISSIONS = [
  'projects',
  'tasks',
  'forms',
  'applications',
  'impact-stories',
].flatMap((resource) => ['read', 'create', 'update'].map((action) => `${resource}:${action}`));

const visit = (path: string, permissions: string[] = ALL_WORK_PERMISSIONS): void => {
  auth.user.permissions = permissions;
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
};

afterEach(() => {
  cleanup();
});

const NO_PERMISSION = 'You do not have permission to view this page.';

describe('work module routes', () => {
  it.each([
    ['/projects', 'ProjectsPage'],
    ['/projects/new', 'ProjectEditorPage'],
    ['/projects/p1/edit', 'ProjectEditorPage'],
    ['/tasks', 'MyTasksPage'],
    ['/tasks/all', 'AllTasksPage'],
    ['/tasks/board', 'TaskBoardPage'],
    ['/tasks/new', 'TaskEditorPage'],
    ['/tasks/IAA-42', 'TaskDetailPage'],
    ['/tasks/IAA-42/edit', 'TaskEditorPage'],
    ['/forms', 'FormsPage'],
    ['/forms/new', 'FormEditorPage'],
    ['/forms/f1', 'FormDetailPage'],
    ['/forms/f1/edit', 'FormEditorPage'],
    ['/applications', 'ApplicationsPage'],
    ['/applications/review', 'ReviewQueuePage'],
    ['/applications/a1', 'ApplicationDetailPage'],
    ['/impact-stories', 'ImpactStoriesPage:drafts'],
    ['/impact-stories/published', 'ImpactStoriesPage:published'],
    ['/impact-stories/new', 'ImpactStoryEditorPage'],
    ['/impact-stories/from-project/p1', 'StoryFromProjectPage'],
    ['/impact-stories/s1/edit', 'ImpactStoryEditorPage'],
  ])('opens %s on %s', (path, page) => {
    visit(path);
    expect(screen.getByText(page)).toBeInTheDocument();
  });

  it.each([
    ['/projects/p1', 'ProjectOverviewTab'],
    ['/projects/p1/tasks', 'ProjectTasksTab'],
    ['/projects/p1/milestones', 'ProjectMilestonesTab'],
    ['/projects/p1/media', 'ProjectMediaTab'],
    ['/projects/p1/impact', 'ProjectImpactTab'],
    ['/projects/p1/documents', 'ProjectDocumentsTab'],
    ['/projects/p1/activity', 'ProjectActivityTab'],
  ])('opens %s inside the project layout', (path, tab) => {
    visit(path);
    expect(screen.getByText(/ProjectDetailLayout/)).toHaveTextContent(tab);
  });

  it('says so when the read permission is missing', () => {
    visit('/applications', ['tasks:read']);
    expect(screen.getByRole('alert')).toHaveTextContent(NO_PERMISSION);
    expect(screen.queryByText('ApplicationsPage')).not.toBeInTheDocument();
  });

  it('needs the create permission for a new record, not just read', () => {
    visit('/tasks/new', ['tasks:read']);
    expect(screen.getByRole('alert')).toHaveTextContent(NO_PERMISSION);
  });

  it('needs to read the project to start a story from it', () => {
    visit('/impact-stories/from-project/p1', ['impact-stories:read', 'impact-stories:create']);
    expect(screen.getByRole('alert')).toHaveTextContent(NO_PERMISSION);
    expect(screen.queryByText('StoryFromProjectPage')).not.toBeInTheDocument();
  });
});
