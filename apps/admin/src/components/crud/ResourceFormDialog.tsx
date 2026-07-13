import { zodResolver } from '@hookform/resolvers/zod';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import { useSaveResource } from '../../resources/hooks';
import type { ResourceConfig, ResourceRow } from '../../resources/types';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';

import { FieldRenderer } from './FieldRenderer';

interface ResourceFormDialogProps {
  resource: ResourceConfig;
  open: boolean;
  initial: ResourceRow | null;
  onClose: () => void;
}

/** Create/edit dialog generated from a resource's field configuration, with an optional live preview. */
export const ResourceFormDialog = ({
  resource,
  open,
  initial,
  onClose,
}: ResourceFormDialogProps): JSX.Element => {
  const save = useSaveResource(resource.key);
  const { control, handleSubmit, reset, watch } = useForm<Record<string, unknown>>({
    // The generic resource schema's input type is `unknown`; bypass the resolver's
    // FieldValues constraint and re-assert the form's value type explicitly.
    resolver: zodResolver(resource.createSchema as never) as Resolver<Record<string, unknown>>,
    defaultValues: resource.defaultValues,
  });
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const canPreview = Boolean(resource.renderPreview);

  // `save` is a fresh object every render (React Query); depend on the stable
  // `reset` fns only, or the effect re-fires on each preview re-render and snaps
  // the tab back to "edit".
  const resetSave = save.reset;
  useEffect(() => {
    if (open) {
      reset(initial ?? resource.defaultValues);
      resetSave();
      setTab('edit');
    }
  }, [open, initial, resource, reset, resetSave]);

  const onSubmit = handleSubmit((values) => {
    save.mutate({ id: initial?.id, body: values }, { onSuccess: () => onClose() });
  });

  const values = watch();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { ...dialogPaperSx, maxHeight: '92vh', overflow: 'hidden' } } }}
    >
      <DialogHeader
        icon={resource.icon}
        eyebrow={`${resource.singular} workspace`}
        title={initial ? `Edit ${resource.singular}` : `Create ${resource.singular}`}
        description={
          initial
            ? 'Update the record and review any changes before saving.'
            : `Add a new ${resource.singular.toLowerCase()} to the workspace.`
        }
        onClose={onClose}
      />

      {canPreview && (
        <Tabs
          value={tab}
          onChange={(_event, next) => setTab(next as 'edit' | 'preview')}
          sx={{
            minHeight: 46,
            px: 3,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 46 },
          }}
        >
          <Tab value="edit" label="Edit" icon={<EditNoteRoundedIcon />} iconPosition="start" />
          <Tab
            value="preview"
            label="Preview"
            icon={<VisibilityRoundedIcon />}
            iconPosition="start"
          />
        </Tabs>
      )}

      <DialogContent sx={{ bgcolor: 'background.default', py: 3 }}>
        {/* Form stays mounted (hidden while previewing) so RHF state + submit persist. */}
        <Box sx={{ display: tab === 'edit' ? 'block' : 'none' }}>
          <Box
            component="form"
            id="resource-form"
            onSubmit={onSubmit}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2.25,
              p: { xs: 2, sm: 3 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              bgcolor: 'background.paper',
            }}
          >
            {resource.fields.map((field) => (
              <Box key={field.name} sx={{ gridColumn: field.wide ? '1 / -1' : 'auto' }}>
                <FieldRenderer field={field} control={control} />
              </Box>
            ))}
          </Box>
          {save.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Could not save. Please review the fields and try again.
            </Alert>
          )}
        </Box>

        {canPreview && (
          <Box
            sx={{
              display: tab === 'preview' ? 'block' : 'none',
              p: { xs: 2, sm: 3 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              bgcolor: 'background.paper',
            }}
          >
            {resource.renderPreview?.(values)}
          </Box>
        )}
      </DialogContent>

      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form="resource-form"
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          disabled={save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
