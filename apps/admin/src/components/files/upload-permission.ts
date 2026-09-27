import { useAuth } from '../../auth/AuthContext';

/**
 * What an upload control says, and what a refused signature turns into, when
 * this person may not upload. Says who can fix it (plan §4.3), in the words
 * the other "you can see this but not change it" notes use.
 */
export const UPLOAD_PERMISSION_NOTE =
  'Uploading files needs Media library access. An administrator can grant it under Users.';

/**
 * Whether this person may upload a file.
 *
 * Every upload is signed by the API first (`POST /admin/media/sign` and
 * `/sign-document`), which needs `media:create`. Editing a task or a project
 * does not imply it: a custom grant from the permission matrix can give one
 * without the other, and the upload then failed with a bare "Missing required
 * permission". Controls ask here and say why instead.
 *
 * Where there is no signed-in console around the control (a component
 * rendered on its own), nothing is known and nothing is held back; the API
 * still has the last word.
 */
export const useCanUploadFiles = (): boolean => {
  let permissions: readonly string[] | undefined;
  try {
    permissions = useAuth().user?.permissions;
  } catch {
    return true;
  }
  return permissions === undefined || permissions.includes('media:create');
};
