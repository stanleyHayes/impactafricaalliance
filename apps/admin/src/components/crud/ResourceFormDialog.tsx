import { zodResolver } from '@hookform/resolvers/zod';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import { useSaveResource } from '../../resources/hooks';
import type { ResourceConfig, ResourceRow } from '../../resources/types';

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
      slotProps={{ paper: { sx: { maxHeight: '92vh', overflow: 'hidden' } } }}
    >
      <DialogTitle sx={{ pb: canPreview ? 1.5 : 2.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', fontWeight: 750, letterSpacing: '0.1em' }}
            >
              {resource.singular} workspace
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.25 }}>
              {initial ? `Edit ${resource.singular}` : `Create ${resource.singular}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {initial
                ? 'Update the record and review any changes before saving.'
                : `Add a new ${resource.singular.toLowerCase()} to the workspace.`}
            </Typography>
          </Box>
          <IconButton aria-label="Close form" onClick={onClose} sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

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

      <DialogContent
        dividers
        sx={{ bgcolor: 'background.default', py: 3, borderTop: canPreview ? 0 : undefined }}
      >
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

      <DialogActions sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="resource-form" variant="contained" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
