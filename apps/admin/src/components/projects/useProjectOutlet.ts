import type { Project, ProjectUpdate } from '@iaa/shared';
import { useOutletContext } from 'react-router-dom';

import { useCan } from '../../auth/useCan';
import { useUpdateProject } from '../../lib/projects';

/** What the project layout hands every tab through `<Outlet context>`. */
export interface ProjectOutletContext {
  project: Project;
}

/**
 * The open project, for a tab rendered inside `ProjectDetailLayout`. The
 * layout has already loaded it and handled loading and errors, so a tab never
 * fetches it again or shows a second spinner.
 */
export const useProjectOutlet = (): ProjectOutletContext =>
  useOutletContext<ProjectOutletContext>();

export interface ProjectPlanEditing {
  project: Project;
  /** Whether this person may change the project (`projects:update`). */
  canUpdate: boolean;
  /** Saves part of the project; rejects with the API's error so a dialog can show it. */
  save: (body: ProjectUpdate) => Promise<Project>;
  saving: boolean;
}

/**
 * For the tabs that edit one list on the project (milestones, metrics,
 * risks) and save it straight away. Each save sends only that list, so two
 * tabs open side by side do not overwrite each other's work.
 */
export const useProjectPlanEditing = (): ProjectPlanEditing => {
  const { project } = useProjectOutlet();
  const can = useCan();
  const update = useUpdateProject();
  return {
    project,
    canUpdate: can('update', 'projects'),
    save: (body) => update.mutateAsync({ id: project.id, body }),
    saving: update.isPending,
  };
};

/** The words for a tab that is read-only to this person, naming who can change that. */
export const READ_ONLY_NOTE =
  'You can see this but not change it. Changing a project needs permission to update projects, which an administrator can grant under Users.';
