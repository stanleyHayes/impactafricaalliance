import { useState } from 'react';

import { useDeleteResource } from '../../resources/hooks';
import { recordName } from '../../resources/record-name';
import type { ResourceConfig, ResourceRow } from '../../resources/types';
import { ConfirmDialog } from '../dialogs/ConfirmDialog';

export interface ResourceDeleteDialogProps {
  resource: ResourceConfig;
  /** The record to delete. Null while the dialog is closed. */
  row: ResourceRow | null;
  onClose: () => void;
}

/**
 * Asks before deleting a record from any generic CMS page (Team, News & Blog,
 * Banners and the rest of the registry).
 *
 * These pages used the browser's own `window.confirm`, which could not say
 * which record was going, looked like nothing else in the console, and gave
 * no sign of progress or failure. This names the record, keeps the dialog
 * open while the request runs so a second click cannot send it again, and
 * shows a failure inside the dialog so the reader can try again without
 * finding the row a second time.
 *
 * The dialog owns its own delete request, so its pending and error state
 * belong to this one record rather than to every row on the page.
 */
export const ResourceDeleteDialog = ({
  resource,
  row,
  onClose,
}: ResourceDeleteDialogProps): JSX.Element => {
  const remove = useDeleteResource(resource.key);
  // The last record asked about, kept after `row` clears so the name does
  // not vanish while the dialog fades out.
  const [shown, setShown] = useState<ResourceRow | null>(row);
  if (row !== null && row !== shown) setShown(row);

  const singular = resource.singular.toLowerCase();
  const name = shown ? recordName(resource, shown) : null;

  // Escape, the backdrop, Cancel and the close button all come here. None of
  // them may close the dialog mid-request: the answer would have nowhere to
  // show, and a failure would pass unseen.
  const close = (): void => {
    if (remove.isPending) return;
    remove.reset();
    onClose();
  };

  const confirm = (): void => {
    if (!row || remove.isPending) return;
    remove.mutate(row.id, {
      onSuccess: () => {
        remove.reset();
        onClose();
      },
    });
  };

  return (
    <ConfirmDialog
      open={row !== null}
      eyebrow={resource.label}
      title={`Delete this ${singular}?`}
      description={
        name ? (
          <>
            <strong>{name}</strong> will be deleted from {resource.label}. This cannot be undone.
          </>
        ) : (
          `This ${singular} will be deleted from ${resource.label}. This cannot be undone.`
        )
      }
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      tone="error"
      pending={remove.isPending}
      error={
        remove.error
          ? remove.error.message || `The ${singular} could not be deleted. Please try again.`
          : null
      }
      onConfirm={confirm}
      onClose={close}
    />
  );
};
